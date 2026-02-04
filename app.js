const express = require("express");
const cors = require("cors");

const routes = require("./src/routes/v1"); // ✅ correct path

const app = express();

app.use(cors());
app.use(express.json());

app.use("/v1", routes);

app.get("/", (req, res) => {
  res.send("🚀 Express Mongo API Running...");
});

module.exports = app;
