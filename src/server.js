require("dotenv").config();
const app = require("../app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

// Only start the local HTTP server when this file
// is executed directly (e.g. `node src/server.js`).
if (require.main === module) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`✅ Server running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error("❌ Failed to start server:", err?.message || err);
      process.exit(1);
    });
}
