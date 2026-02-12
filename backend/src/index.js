require("dotenv").config();
const express = require("express");
const path = require("path");
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
  let user = await User.findOne({ telegramId: telegramUserId });
  if (!user) {
    user = await User.create({
      telegramId: telegramUserId,
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
      const invoice = await bot.createInvoiceLink({
        title: `Deposit ${amount} Stars`,
        description: `Add ${amount} Stars to your wallet`,
        payload: JSON.stringify({ action: "deposit", currency: "star", userId, amount }),
        provider_token: "", // Empty for Telegram Stars
        currency: "XTR", // XTR = Telegram Stars
        prices: [{ label: `${amount} Stars`, amount: amount }],
      });

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
    console.error("Deposit error:", error);
    return res.status(500).json({ error: "Failed to create invoice" });
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

    const transactions = await Transaction.find({ telegramId: userId })
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

// Health check API
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "telegram-wallet-backend" });
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
                web_app: { url: process.env.WEBAPP_URL || process.env.KOYEB_URL || "https://teenage-blondie-chetan1-3c9842f1.koyeb.app" },
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
  const KOYEB_URL = process.env.KOYEB_URL || "https://teenage-blondie-chetan1-3c9842f1.koyeb.app";
  bot.setWebHook(`${KOYEB_URL}/api/telegram-webhook`)
    .then(() => console.log("✅ Webhook set successfully"))
    .catch((err) => console.error("❌ Webhook error:", err));
});
