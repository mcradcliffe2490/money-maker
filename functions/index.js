

const functions = require("firebase-functions");

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions

const API_KEYS = require('./app-env.js')


// SDK Config //
const {Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    organization: API_KEYS.openaiOrganization,
    apiKey: API_KEYS.openaiKey
});

const openai = new OpenAIApi(configuration);

//
exports.helloWorld = functions.https.onRequest(async (request, response) => {
  const gptCompletion = await openai.createCompletion("text-davinci-001", {
    prompt: 'The following stock tickers are popular on r/wallstreetbets',
    temperature: 0.7,
    max_tokens: 32,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0
  });

  response.send(gptCompletion.data) 

});
