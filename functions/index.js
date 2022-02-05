const functions = require("firebase-functions");

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
const API_KEYS = require('./app-env.js');

// SDK Config //
const {Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    organization: API_KEYS.openaiOrganization,
    apiKey: API_KEYS.openaiKey
});

const openai = new OpenAIApi(configuration);

// Alpaca Javascript trader 
const AlpacaAPI = require('@alpacahq/alpaca-trade-api');
const alpaca = new AlpacaAPI ({
  keyId: API_KEYS.alpacaKeyID,
  secretKey: API_KEYS.alpacaSecretKey,
  paper: true
});

// PUPPETEER Scrapes data from Reddit to better contextualize AI results
// Headless browser is created to scrape internet pages

const puppeteer = require('puppeteer');

async function scrape() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto("https://www.reddit.com/r/wallstreetbets/hot/", {
    waitUntil: 'networkidle2'
  });

  await page.waitForTimeout(3000);
  
  await page.waitForSelector('body');

  console.log("begin scraping!")

  // TODO: Improve by adding functionality to only grab positively talked about tickers
  const redditPosts = await page.evaluate(async () => {
    let posts = document.body.querySelectorAll('.Post');
    var redditItems = "";
    posts.forEach((item) => {
      let title = item.querySelector('h3').innerText;
      let description = ' ';
      try {
        description = item.querySelector('p').innerText;
      } catch(e) {
        // no description for this reddit post
      }
      redditItems += title + '\n' + description + '\n\n\n';
        });
        return redditItems
  });

  await browser.close();

  console.log("reddit post scraped!");

  return redditPosts;
}

exports.helloWorld = functions.https.onRequest(async (request, response) => {
  // test logic here
});

exports.getMoney = functions
  .runWith({memory: '4GB'})
  .pubsub.schedule("0 10 * * 1-5")
  .timeZone('America/New_York')
  .onRun(async (ctx) => {
    console.log('This algorithm will run Monday through Friday at 10 am Eastern');

    const redditData = await scrape();
    console.log("scrapped reddit data has been returned")
  
    const gptCompletion = await openai.createCompletion("text-davinci-001", {
      prompt: `${redditData}. r/wallstreetbets users would buy these stock tickers`,
      temperature: 0.7,
      max_tokens: 32,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });
  
    console.log("scrapped reddit data was given to GPT-3 for safe keeping")
  
    const stocksToBuy = gptCompletion.data.choices[0].text.match(/\b[A-Z]+\b/g);
  
    if (!stocksToBuy) {
      console.log('no new stocks to buy today');
      console.log(gptCompletion.data.choices[0].text + ' GPT-3 Result')
      return null;
    }
  
    // every day, all unfilled orders are cancelled and all positions are closed
  
    const cancel = await alpaca.cancelAllOrders();
    const liquidate = await alpaca.closeAllPositions(); 
  
    // Get account and check your buying power 
    const account = await alpaca.getAccount();
    console.log(`buying power:  ${account.buying_power}`);
  
    // place orders
    const orders = new Array(stocksToBuy.length);
    var i = 0;
    while(i < stocksToBuy.length) {
      orders[i] = await alpaca.createOrder({
        symbol: stocksToBuy[i],
        notional: account.buying_power * (1/stocksToBuy.length), // uses a fraction of buying power based on number of stocks given
        side: 'buy',
        type: 'market',
        time_in_force: 'day'
      });
      i+=1;
    }
    response.send('order placed! Check your Alpaca account')
    return null;

  });

