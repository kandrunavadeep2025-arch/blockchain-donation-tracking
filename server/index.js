const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/campaigns", require("./routes/campaignRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));

app.get("/", (req, res) => {
  res.send("DonateChain Backend is Running!");
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "DonateChain API is working",
    database: mongoose.connection.readyState === 1
      ? "Connected"
      : "Disconnected",
  });
});

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully!");

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(
        `DonateChain backend running at http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
  }
}

startServer();