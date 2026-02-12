const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    telegramId: {
      type: Number,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["deposit", "withdraw", "bet", "win", "bonus"],
      required: true,
    },
    currency: {
      type: String,
      enum: ["dollar", "star"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    telegramPaymentId: String,
    description: String,
    game: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
