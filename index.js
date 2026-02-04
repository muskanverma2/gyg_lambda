// Local Lambda entry + runner (keeps SAM handler unchanged)
require("dotenv").config();

const { handler } = require("./src/lambda");

// If required as a module, just export the Lambda handler
module.exports = { handler };

// If run directly: simulate a Lambda invocation locally
if (require.main === module) {
  // Simple API Gateway-like event hitting your Express "/" route
  const event = {
    httpMethod: "GET",
    path: "/",
    headers: {},
    queryStringParameters: null,
    body: null,
    isBase64Encoded: false,
  };

  const context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: "local-test",
  };

  handler(event, context)
    .then((response) => {
      console.log("Lambda response:");
      console.log(JSON.stringify(response, null, 2));
    })
    .catch((err) => {
      console.error("Lambda error:", err);
      process.exit(1);
    });
}

