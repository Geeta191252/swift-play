require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const mongoose = require("mongoose");
const TelegramBot = require("node-telegram-bot-api");

const User = require("./models/User");
const Transaction = require("./models/Transaction");

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// Telegram Bot (polling mode for dev, webhook for production)
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

// ============================================
// HELPER: Get or create user
// ============================================
async function getOrCreateUser(telegramUserId) {
  // Convert to number; use 0 as fallback for "demo" or invalid values
  const numericId = Number(telegramUserId);
  if (!numericId || isNaN(numericId)) {
    // Return a default demo user object without DB
    return { telegramId: 0, dollarBalance: 0, starBalance: 0, save: async () => {} };
  }
  let user = await User.findOne({ telegramId: numericId });
  if (!user) {
    user = await User.create({
      telegramId: numericId,
      dollarBalance: 0,
      starBalance: 0,
    });
  }
  return user;
}

// ============================================
// POST /api/deposit
// Creates a Telegram Stars invoice for deposit
// ============================================
app.post("/api/deposit", async (req, res) => {
  try {
    const { userId, currency, amount } = req.body;

    if (!userId || !currency || !amount) {
      return res.status(400).json({ error: "Missing userId, currency, or amount" });
    }

    if (currency === "star") {
      // Telegram Stars payment via invoice
      const invoice = await bot.createInvoiceLink(
        `Deposit ${amount} Stars`,           // title
        `Add ${amount} Stars to your wallet`, // description
        JSON.stringify({ action: "deposit", currency: "star", userId, amount }), // payload
        "",                                   // provider_token (empty for Stars)
        "XTR",                                // currency
        [{ label: `${amount} Stars`, amount: amount }] // prices
      );

      return res.json({ invoiceUrl: invoice });
    }

    if (currency === "dollar") {
      // For dollar deposits, you need a real payment provider (Stripe, etc.)
      // Configure provider_token from BotFather -> Payments
      const PAYMENT_PROVIDER_TOKEN = process.env.PAYMENT_PROVIDER_TOKEN || "";

      if (!PAYMENT_PROVIDER_TOKEN) {
        return res.status(500).json({ error: "Payment provider not configured for dollar deposits" });
      }

      const invoice = await bot.createInvoiceLink({
        title: `Deposit $${amount}`,
        description: `Add $${amount} to your wallet`,
        payload: JSON.stringify({ action: "deposit", currency: "dollar", userId, amount }),
        provider_token: PAYMENT_PROVIDER_TOKEN,
        currency: "USD",
        prices: [{ label: `$${amount}`, amount: amount * 100 }], // cents
      });

      return res.json({ invoiceUrl: invoice });
    }

    return res.status(400).json({ error: "Invalid currency. Use 'dollar' or 'star'" });
  } catch (error) {
    console.error("Deposit error:", error?.response?.body || error.message || error);
    const msg = error?.response?.body?.description || error.message || "Failed to create invoice";
    return res.status(500).json({ error: msg });
  }
});

// ============================================
// POST /api/withdraw
// Process withdrawal request
// ============================================
app.post("/api/withdraw", async (req, res) => {
  try {
    const { userId, currency, amount } = req.body;

    if (!userId || !currency || !amount) {
      return res.status(400).json({ error: "Missing userId, currency, or amount" });
    }

    const user = await getOrCreateUser(userId);

    const balanceField = currency === "dollar" ? "dollarBalance" : "starBalance";
    if (user[balanceField] < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Deduct balance
    user[balanceField] -= amount;
    await user.save();

    // Log transaction
    await Transaction.create({
      telegramId: userId,
      type: "withdraw",
      currency,
      amount: -amount,
      status: "completed",
      description: `Withdrawal of ${currency === "dollar" ? "$" + amount : amount + " Stars"}`,
    });

    // TODO: Actually send funds to user
    // For Stars: use bot.refundStarPayment() or manual transfer
    // For Dollars: use Stripe payout or similar

    return res.json({
      success: true,
      newBalance: user[balanceField],
      message: `Withdrawal of ${amount} ${currency} processed`,
    });
  } catch (error) {
    console.error("Withdraw error:", error);
    return res.status(500).json({ error: "Withdrawal failed" });
  }
});

// ============================================
// POST /api/balance
// Get user balance
// ============================================
app.post("/api/balance", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const user = await getOrCreateUser(userId);
    return res.json({
      dollarBalance: user.dollarBalance,
      starBalance: user.starBalance,
    });
  } catch (error) {
    console.error("Balance error:", error);
    return res.status(500).json({ error: "Failed to fetch balance" });
  }
});

// ============================================
// POST /api/transactions
// Get user transactions
// ============================================
app.post("/api/transactions", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const numericId = Number(userId);
    if (!numericId || isNaN(numericId)) {
      return res.json({ transactions: [] });
    }

    const transactions = await Transaction.find({ telegramId: numericId })
      .sort({ createdAt: -1 })
      .limit(20);

    return res.json({ transactions });
  } catch (error) {
    console.error("Transactions error:", error);
    return res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// ============================================
// Serve frontend static files
// ============================================
app.use(express.static(path.join(__dirname, "../public")));

// Debug: check if frontend files exist
app.get("/api/debug", (req, res) => {
  const publicDir = path.join(__dirname, "../public");
  try {
    const exists = fs.existsSync(publicDir);
    const files = exists ? fs.readdirSync(publicDir) : [];
    const indexExists = fs.existsSync(path.join(publicDir, "index.html"));
    res.json({ publicDir, exists, files, indexExists, dirname: __dirname });
  } catch (err) {
    res.json({ error: err.message, dirname: __dirname });
  }
});

// Health check API
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "telegram-wallet-backend", version: "2.0" });
});

// ============================================
// GET /api/admin/stats - Owner stats (Stars earned, all transactions)
// Only accessible with owner telegram ID
// ============================================
app.post("/api/admin/stats", async (req, res) => {
  try {
    const { ownerId } = req.body;
    
    // Only owner can access (your Telegram ID)
    if (String(ownerId) !== "6965488457") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Total Stars deposited by all users
    const starDeposits = await Transaction.aggregate([
      { $match: { type: "deposit", currency: "star", status: "completed" } },
      { $group: { _id: null, totalStars: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]);

    // Total Dollar deposits
    const dollarDeposits = await Transaction.aggregate([
      { $match: { type: "deposit", currency: "dollar", status: "completed" } },
      { $group: { _id: null, totalDollars: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]);

    // Recent transactions (all users)
    const recentTransactions = await Transaction.find({ type: "deposit" })
      .sort({ createdAt: -1 })
      .limit(50);

    // Total users
    const totalUsers = await User.countDocuments();

    return res.json({
      totalStarsEarned: starDeposits[0]?.totalStars || 0,
      starDepositCount: starDeposits[0]?.count || 0,
      totalDollarsEarned: dollarDeposits[0]?.totalDollars || 0,
      dollarDepositCount: dollarDeposits[0]?.count || 0,
      totalUsers,
      recentTransactions,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ============================================
// POST /api/convert-stars - Convert Stars to Dollars
// Rate: 100 Stars = $1
// ============================================
const STAR_TO_DOLLAR_RATE = 100;

app.post("/api/convert-stars", async (req, res) => {
  try {
    const { userId, starAmount } = req.body;

    if (!userId || !starAmount || starAmount < STAR_TO_DOLLAR_RATE) {
      return res.status(400).json({ error: `Minimum ${STAR_TO_DOLLAR_RATE} Stars required` });
    }

    const user = await getOrCreateUser(userId);

    if (user.starBalance < starAmount) {
      return res.status(400).json({ error: "Insufficient Star balance" });
    }

    const dollarAmount = starAmount / STAR_TO_DOLLAR_RATE;

    user.starBalance -= starAmount;
    user.dollarBalance += dollarAmount;
    await user.save();

    // Log conversion transactions
    await Transaction.create({
      telegramId: userId,
      type: "convert",
      currency: "star",
      amount: -starAmount,
      status: "completed",
      description: `Converted ${starAmount} ⭐ → $${dollarAmount.toFixed(2)}`,
    });

    return res.json({
      success: true,
      starBalance: user.starBalance,
      dollarBalance: user.dollarBalance,
      converted: { stars: starAmount, dollars: dollarAmount },
    });
  } catch (error) {
    console.error("Convert error:", error);
    return res.status(500).json({ error: "Conversion failed" });
  }
});

// ============================================
// POST /api/game/result - Report game result
// ============================================
app.post("/api/game/result", async (req, res) => {
  try {
    const { userId, betAmount, winAmount, currency, game } = req.body;

    if (!userId || betAmount === undefined || winAmount === undefined || !currency || !game) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const user = await getOrCreateUser(userId);
    const balanceField = currency === "dollar" ? "dollarBalance" : "starBalance";
    const netAmount = winAmount - betAmount;

    user[balanceField] += netAmount;
    if (user[balanceField] < 0) user[balanceField] = 0;
    await user.save();

    await Transaction.create({
      telegramId: userId,
      type: netAmount >= 0 ? "win" : "loss",
      currency,
      amount: netAmount,
      status: "completed",
      description: `${game}: Bet ${betAmount}, Won ${winAmount}`,
    });

    return res.json({
      dollarBalance: user.dollarBalance,
      starBalance: user.starBalance,
    });
  } catch (error) {
    console.error("Game result error:", error);
    return res.status(500).json({ error: "Failed to process game result" });
  }
});

// ============================================
// Telegram Bot /start command via webhook
// ============================================
app.post("/api/telegram-webhook", async (req, res) => {
  try {
    const update = req.body;

    // Handle /start command
    if (update.message?.text === "/start") {
      const chatId = update.message.chat.id;
      const firstName = update.message.from.first_name || "Player";

      await bot.sendMessage(chatId, `🎮 Welcome ${firstName} to Royal King Game!\n\nTap the button below to start playing!`, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🎮 Play Now",
                web_app: { url: process.env.WEBAPP_URL || process.env.KOYEB_URL || "https://broken-bria-chetan1-ea890b93.koyeb.app" },
              },
            ],
          ],
        },
      });

      return res.sendStatus(200);
    }

    // Handle successful payment
    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      const payload = JSON.parse(payment.invoice_payload);
      const { userId, currency, amount } = payload;

      const user = await getOrCreateUser(userId);

      if (currency === "star") {
        user.starBalance += amount;
      } else if (currency === "dollar") {
        user.dollarBalance += amount;
      }
      await user.save();

      await Transaction.create({
        telegramId: userId,
        type: "deposit",
        currency,
        amount: amount,
        status: "completed",
        telegramPaymentId: payment.telegram_payment_charge_id,
        description: `Deposit of ${currency === "dollar" ? "$" + amount : amount + " Stars"}`,
      });

      console.log(`✅ Payment received: ${amount} ${currency} for user ${userId}`);
    }

    // Handle pre-checkout query
    if (update.pre_checkout_query) {
      await bot.answerPreCheckoutQuery(update.pre_checkout_query.id, true);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error:", error);
    res.sendStatus(200);
  }
});

// SPA fallback - serve index.html for all non-API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// ============================================
// Start server
// ============================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Set Telegram webhook automatically
  const KOYEB_URL = process.env.KOYEB_URL || "https://broken-bria-chetan1-ea890b93.koyeb.app";
  bot.setWebHook(`${KOYEB_URL}/api/telegram-webhook`)
    .then(() => console.log("✅ Webhook set successfully"))
    .catch((err) => console.error("❌ Webhook error:", err));
});
