const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    // In AWS Lambda, calling process.exit() will kill the execution environment.
    // Throw instead so the invoker gets a proper error response/logs.
    throw error;
  }
};

module.exports = connectDB;
