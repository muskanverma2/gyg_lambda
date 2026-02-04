require("dotenv").config();

const serverless = require("serverless-http");
const app = require("../app");
const connectDB = require("./config/db");

let dbConnectPromise;
function ensureDbConnected() {
  if (!dbConnectPromise) {
    dbConnectPromise = connectDB();
  }
  return dbConnectPromise;
}

// AWS Lambda handler (API Gateway / Lambda Function URL compatible via serverless-http)
module.exports.handler = async (event, context) => {
  // Allow the Node.js event loop to be reused between invocations (connection pooling)
  context.callbackWaitsForEmptyEventLoop = false;

  await ensureDbConnected();
  return serverless(app)(event, context);
};

