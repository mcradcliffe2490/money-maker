import openaikey from "app-env.js";

const functions = require("firebase-functions");

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions

// SDK Config //
const {Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: openaikey
});


//
exports.helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});


