const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    telegramId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    dollarBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    starBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    dollarWinning: {
      type: Number,
      default: 0,
      min: 0,
    },
    starWinning: {
      type: Number,
      default: 0,
      min: 0,
    },
    username: String,
    firstName: String,
    lastName: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
