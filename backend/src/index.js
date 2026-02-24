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
// Capture raw body for IPN signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    if (req.url === '/api/crypto/ipn') {
      req.rawBody = buf.toString('utf8');
    }
  }
}));

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
// Creates a PENDING withdrawal request (admin must approve)
// ============================================
app.post("/api/withdraw", async (req, res) => {
  try {
    const { userId, currency, amount, cryptoAddress, network } = req.body;

    if (!userId || !currency || !amount) {
      return res.status(400).json({ error: "Missing userId, currency, or amount" });
    }
    if (!cryptoAddress) {
      return res.status(400).json({ error: "Crypto wallet address is required" });
    }

    const user = await getOrCreateUser(userId);

    // Withdraw only from winning
    const winningField = currency === "dollar" ? "dollarWinning" : "starWinning";
    if ((user[winningField] || 0) < amount) {
      return res.status(400).json({ error: "Insufficient winning balance. Withdrawals are only allowed from winnings." });
    }

    // Hold the amount (deduct from winning immediately to prevent double-spend)
    user[winningField] -= amount;
    await user.save();

    // Create PENDING transaction
    await Transaction.create({
      telegramId: userId,
      type: "withdraw",
      currency,
      amount: -amount,
      status: "pending",
      cryptoAddress,
      withdrawalNetwork: network || "",
      description: `Withdrawal of ${currency === "dollar" ? "$" + amount : amount + " Stars"} to ${cryptoAddress}`,
    });

    return res.json({
      success: true,
      message: `Withdrawal request of ${amount} ${currency} submitted. Admin will review and process it.`,
    });
  } catch (error) {
    console.error("Withdraw error:", error);
    return res.status(500).json({ error: "Withdrawal failed" });
  }
});

// ============================================
// POST /api/admin/approve-withdrawal - Admin approves withdrawal
// ============================================
app.post("/api/admin/approve-withdrawal", async (req, res) => {
  try {
    const { ownerId, transactionId } = req.body;
    if (String(ownerId) !== "6965488457") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const tx = await Transaction.findById(transactionId);
    if (!tx || tx.type !== "withdraw" || tx.status !== "pending") {
      return res.status(404).json({ error: "Pending withdrawal not found" });
    }

    tx.status = "completed";
    await tx.save();

    // Send Telegram notification to user
    try {
      const amount = Math.abs(tx.amount);
      const symbol = tx.currency === "dollar" ? "$" : "⭐";
      await bot.sendMessage(tx.telegramId, 
        `✅ *Withdrawal Approved!*\n\n` +
        `💰 Amount: ${symbol}${amount}\n` +
        `📍 Address: \`${tx.cryptoAddress}\`\n` +
        `🔗 Network: ${tx.withdrawalNetwork || "N/A"}\n\n` +
        `Your funds will be sent shortly!`,
        { parse_mode: "Markdown" }
      );
    } catch (botErr) {
      console.error("Failed to send approval notification:", botErr.message);
    }

    return res.json({ success: true, message: "Withdrawal approved and user notified" });
  } catch (error) {
    console.error("Approve withdrawal error:", error);
    return res.status(500).json({ error: "Failed to approve withdrawal" });
  }
});

// ============================================
// POST /api/admin/reject-withdrawal - Admin rejects withdrawal
// ============================================
app.post("/api/admin/reject-withdrawal", async (req, res) => {
  try {
    const { ownerId, transactionId, reason } = req.body;
    if (String(ownerId) !== "6965488457") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const tx = await Transaction.findById(transactionId);
    if (!tx || tx.type !== "withdraw" || tx.status !== "pending") {
      return res.status(404).json({ error: "Pending withdrawal not found" });
    }

    // Refund amount back to user's winning
    const user = await User.findOne({ telegramId: tx.telegramId });
    if (user) {
      const winningField = tx.currency === "dollar" ? "dollarWinning" : "starWinning";
      user[winningField] = (user[winningField] || 0) + Math.abs(tx.amount);
      await user.save();
    }

    tx.status = "failed";
    tx.description = `${tx.description} | Rejected: ${reason || "No reason"}`;
    await tx.save();

    // Send Telegram notification to user
    try {
      const amount = Math.abs(tx.amount);
      const symbol = tx.currency === "dollar" ? "$" : "⭐";
      await bot.sendMessage(tx.telegramId,
        `❌ *Withdrawal Rejected*\n\n` +
        `💰 Amount: ${symbol}${amount}\n` +
        `📍 Address: \`${tx.cryptoAddress}\`\n` +
        `${reason ? `📝 Reason: ${reason}\n` : ""}\n` +
        `Your funds have been returned to your winning balance.`,
        { parse_mode: "Markdown" }
      );
    } catch (botErr) {
      console.error("Failed to send rejection notification:", botErr.message);
    }

    return res.json({ success: true, message: "Withdrawal rejected and funds returned" });
  } catch (error) {
    console.error("Reject withdrawal error:", error);
    return res.status(500).json({ error: "Failed to reject withdrawal" });
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
      dollarWinning: user.dollarWinning || 0,
      starWinning: user.starWinning || 0,
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

    const transactions = await Transaction.find({ telegramId: numericId, status: "completed" })
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
  res.json({ status: "ok", service: "telegram-wallet-backend", version: "6.0-wallet-winning-split" });
});

// ============================================
// POST /api/admin/cleanup-wins - Remove all old win transactions
// so winnings start fresh from 0. Only owner can call this.
// ============================================
app.post("/api/admin/cleanup-wins", async (req, res) => {
  try {
    const { ownerId, userId } = req.body;
    if (String(ownerId) !== "6965488457") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const filter = { type: "win", status: "completed" };
    if (userId) filter.telegramId = Number(userId);

    const result = await Transaction.deleteMany(filter);
    return res.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Deleted ${result.deletedCount} win transactions${userId ? ` for user ${userId}` : ' for all users'}. Winnings reset to 0.`,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return res.status(500).json({ error: "Cleanup failed" });
  }
});

// Debug: check win transactions for a user
app.post("/api/debug-winnings", async (req, res) => {
  const { userId } = req.body;
  const numericId = Number(userId);
  const winTxns = await Transaction.find({ telegramId: numericId, type: "win", status: "completed" }).lean();
  const depositTxns = await Transaction.find({ telegramId: numericId, type: "deposit", status: "completed" }).lean();
  const allTxns = await Transaction.find({ telegramId: numericId, status: "completed" }).select("type currency amount").lean();
  res.json({ winCount: winTxns.length, depositCount: depositTxns.length, wins: winTxns, allTypes: allTxns.map(t => ({ type: t.type, currency: t.currency, amount: t.amount })) });
});

// Debug: GET endpoint to easily check winnings in browser
app.get("/api/debug-winnings/:userId", async (req, res) => {
  try {
    const numericId = Number(req.params.userId);
    if (!numericId) return res.json({ error: "Invalid userId" });
    
    const allTxns = await Transaction.find({ telegramId: numericId, status: "completed" })
      .select("type currency amount createdAt description")
      .sort({ createdAt: -1 })
      .lean();
    
    const winTxns = allTxns.filter(t => t.type === "win");
    const depositTxns = allTxns.filter(t => t.type === "deposit");
    
    const starWinTotal = winTxns.filter(t => t.currency === "star").reduce((s, t) => s + t.amount, 0);
    const dollarWinTotal = winTxns.filter(t => t.currency === "dollar").reduce((s, t) => s + t.amount, 0);
    const starDepositTotal = depositTxns.filter(t => t.currency === "star").reduce((s, t) => s + t.amount, 0);
    
    res.json({
      userId: numericId,
      summary: {
        starWinnings: starWinTotal,
        dollarWinnings: dollarWinTotal,
        starDeposits: starDepositTotal,
        totalTransactions: allTxns.length,
        winCount: winTxns.length,
        depositCount: depositTxns.length,
      },
      allTransactions: allTxns.map(t => ({
        type: t.type,
        currency: t.currency,
        amount: t.amount,
        date: t.createdAt,
        description: t.description,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


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
// POST /api/admin/users - Get all users list with balances
// ============================================
app.post("/api/admin/users", async (req, res) => {
  try {
    const { ownerId } = req.body;
    if (String(ownerId) !== "6965488457") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const users = await User.find({}).sort({ createdAt: -1 }).lean();

    // Get pending withdrawal requests (include _id for approve/reject)
    const withdrawals = await Transaction.find({ type: "withdraw", status: "pending" })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ users, withdrawals });
  } catch (error) {
    console.error("Admin users error:", error);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ============================================
// POST /api/admin/adjust-balance - Admin adjust user funds (+/-)
// ============================================
app.post("/api/admin/adjust-balance", async (req, res) => {
  try {
    const { ownerId, targetUserId, currency, amount, balanceType } = req.body;
    if (String(ownerId) !== "6965488457") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    if (!targetUserId || !currency || amount === undefined || !balanceType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const user = await getOrCreateUser(targetUserId);
    if (!user || user.telegramId === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Determine which field to adjust
    let field;
    if (currency === "dollar" && balanceType === "deposit") field = "dollarBalance";
    else if (currency === "dollar" && balanceType === "winning") field = "dollarWinning";
    else if (currency === "star" && balanceType === "deposit") field = "starBalance";
    else if (currency === "star" && balanceType === "winning") field = "starWinning";
    else return res.status(400).json({ error: "Invalid currency/balanceType" });

    const currentVal = user[field] || 0;
    const newVal = currentVal + amount;
    if (newVal < 0) {
      return res.status(400).json({ error: `Cannot go below 0. Current: ${currentVal}` });
    }

    user[field] = newVal;
    await user.save();

    // Log transaction
    await Transaction.create({
      telegramId: targetUserId,
      type: amount > 0 ? "bonus" : "withdraw",
      currency,
      amount,
      status: "completed",
      description: `Admin ${amount > 0 ? "added" : "removed"} ${Math.abs(amount)} ${currency} (${balanceType})`,
    });

    return res.json({
      success: true,
      field,
      oldValue: currentVal,
      newValue: newVal,
      dollarBalance: user.dollarBalance,
      starBalance: user.starBalance,
      dollarWinning: user.dollarWinning || 0,
      starWinning: user.starWinning || 0,
    });
  } catch (error) {
    console.error("Admin adjust error:", error);
    return res.status(500).json({ error: "Adjustment failed" });
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
    const winningField = currency === "dollar" ? "dollarWinning" : "starWinning";

    const walletBalance = user[balanceField] || 0;
    const winningBalance = user[winningField] || 0;
    const totalPlayable = walletBalance + winningBalance;

    // Bet deducts from combined playable amount: first wallet, then winning
    if (betAmount > 0) {
      if (totalPlayable < betAmount) {
        return res.status(400).json({ error: "Insufficient combined balance" });
      }

      const deductFromWallet = Math.min(walletBalance, betAmount);
      const remainingAfterWallet = betAmount - deductFromWallet;

      user[balanceField] = walletBalance - deductFromWallet;
      user[winningField] = winningBalance - remainingAfterWallet;
    }

    // Win adds to winning pool
    if (winAmount > 0) {
      user[winningField] = (user[winningField] || 0) + winAmount;
    }

    await user.save();

    if (winAmount > 0) {
      await Transaction.create({
        telegramId: userId,
        type: "win",
        currency,
        amount: winAmount,
        status: "completed",
        description: `${game}: Bet ${betAmount}, Won ${winAmount}`,
      });
    }
    if (betAmount > 0) {
      await Transaction.create({
        telegramId: userId,
        type: "bet",
        currency,
        amount: -betAmount,
        status: "completed",
        description: `${game}: Bet ${betAmount}`,
      });
    }

    return res.json({
      dollarBalance: user.dollarBalance,
      starBalance: user.starBalance,
      dollarWinning: user.dollarWinning || 0,
      starWinning: user.starWinning || 0,
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

    // Handle /admin command - only for owner
    if (update.message?.text === "/admin") {
      const chatId = update.message.chat.id;
      const fromId = update.message.from.id;

      if (String(fromId) !== "6965488457") {
        await bot.sendMessage(chatId, "⛔ You are not authorized to access the admin panel.");
        return res.sendStatus(200);
      }

      const webAppUrl = process.env.WEBAPP_URL || process.env.KOYEB_URL || "https://broken-bria-chetan1-ea890b93.koyeb.app";
      await bot.sendMessage(chatId, "👑 Admin Panel\n\nTap below to open the admin dashboard:", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🛡️ Open Admin Panel",
                web_app: { url: `${webAppUrl}/admin` },
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

// ============================================
// TON Wallet Integration
// ============================================
const OWNER_TON_WALLET = process.env.OWNER_TON_WALLET || "";

// Helper: Fetch TON/USD price from CoinGecko
async function getTonUsdPrice() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd");
    const data = await res.json();
    return data["the-open-network"]?.usd || 2.5; // fallback price
  } catch {
    return 2.5; // fallback
  }
}

// POST /api/ton/init-deposit - Get owner wallet + create pending deposit
app.post("/api/ton/init-deposit", async (req, res) => {
  try {
    const { userId, tonAmount } = req.body;
    if (!userId || !tonAmount || tonAmount <= 0) {
      return res.status(400).json({ error: "Missing userId or tonAmount" });
    }
    if (!OWNER_TON_WALLET) {
      return res.status(500).json({ error: "Owner TON wallet not configured" });
    }

    const tonPrice = await getTonUsdPrice();
    const usdEquivalent = tonAmount * tonPrice;

    // Create unique deposit comment
    const depositComment = `deposit_${userId}_${Date.now()}`;

    // Create pending transaction
    const tx = await Transaction.create({
      telegramId: Number(userId),
      type: "ton_deposit",
      currency: "ton",
      amount: tonAmount,
      status: "pending",
      tonAmount: tonAmount,
      tonReceiverAddress: OWNER_TON_WALLET,
      depositComment,
      usdEquivalent,
      description: `TON Deposit: ${tonAmount} TON ≈ $${usdEquivalent.toFixed(2)}`,
    });

    return res.json({
      ownerWallet: OWNER_TON_WALLET,
      depositComment,
      tonAmount,
      usdEquivalent,
      tonPrice,
      transactionId: tx._id,
    });
  } catch (error) {
    console.error("TON init-deposit error:", error);
    return res.status(500).json({ error: "Failed to init TON deposit" });
  }
});

// POST /api/ton/confirm-deposit - Confirm deposit after user sends TON
app.post("/api/ton/confirm-deposit", async (req, res) => {
  try {
    const { userId, transactionId, bocHash } = req.body;
    if (!userId || !transactionId) {
      return res.status(400).json({ error: "Missing userId or transactionId" });
    }

    const tx = await Transaction.findById(transactionId);
    if (!tx || tx.status !== "pending" || tx.type !== "ton_deposit") {
      return res.status(400).json({ error: "Invalid or already processed transaction" });
    }
    if (tx.telegramId !== Number(userId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Mark as completed and credit user balance
    tx.status = "completed";
    tx.tonTxHash = bocHash || "tonconnect_confirmed";
    await tx.save();

    const user = await getOrCreateUser(userId);
    user.dollarBalance += tx.usdEquivalent;
    await user.save();

    console.log(`✅ TON Deposit: ${tx.tonAmount} TON ($${tx.usdEquivalent.toFixed(2)}) for user ${userId}`);

    return res.json({
      success: true,
      credited: tx.usdEquivalent,
      dollarBalance: user.dollarBalance,
      starBalance: user.starBalance,
    });
  } catch (error) {
    console.error("TON confirm-deposit error:", error);
    return res.status(500).json({ error: "Failed to confirm TON deposit" });
  }
});

// POST /api/ton/withdraw - Withdraw dollars via TON
app.post("/api/ton/withdraw", async (req, res) => {
  try {
    const { userId, dollarAmount, tonWalletAddress } = req.body;
    if (!userId || !dollarAmount || !tonWalletAddress) {
      return res.status(400).json({ error: "Missing userId, dollarAmount, or tonWalletAddress" });
    }
    if (dollarAmount < 10) {
      return res.status(400).json({ error: "Minimum withdrawal is $10" });
    }

    const user = await getOrCreateUser(userId);
    if ((user.dollarWinning || 0) < dollarAmount) {
      return res.status(400).json({ error: "Insufficient winning balance. Withdrawals are only from winnings." });
    }

    const tonPrice = await getTonUsdPrice();
    const tonAmount = dollarAmount / tonPrice;

    // Deduct from winning
    user.dollarWinning -= dollarAmount;
    await user.save();

    // Create withdrawal transaction (owner will process manually)
    await Transaction.create({
      telegramId: Number(userId),
      type: "ton_withdraw",
      currency: "ton",
      amount: -dollarAmount,
      tonAmount,
      tonReceiverAddress: tonWalletAddress,
      usdEquivalent: dollarAmount,
      status: "pending",
      description: `TON Withdraw: $${dollarAmount} ≈ ${tonAmount.toFixed(4)} TON → ${tonWalletAddress.slice(0, 8)}...`,
    });

    // Notify owner via Telegram
    try {
      await bot.sendMessage(6965488457, 
        `💰 TON Withdrawal Request!\n\nUser: ${userId}\nAmount: $${dollarAmount} ≈ ${tonAmount.toFixed(4)} TON\nSend to: \`${tonWalletAddress}\`\nTON Price: $${tonPrice.toFixed(2)}`,
        { parse_mode: "Markdown" }
      );
    } catch (e) {
      console.error("Failed to notify owner:", e.message);
    }

    return res.json({
      success: true,
      tonAmount,
      tonPrice,
      dollarAmount,
      dollarBalance: user.dollarBalance,
      starBalance: user.starBalance,
      message: "Withdrawal request submitted. TON will be sent to your wallet shortly.",
    });
  } catch (error) {
    console.error("TON withdraw error:", error);
    return res.status(500).json({ error: "Withdrawal failed" });
  }
});

// POST /api/ton/price - Get current TON price
app.get("/api/ton/price", async (req, res) => {
  try {
    const price = await getTonUsdPrice();
    return res.json({ tonUsdPrice: price });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch price" });
  }
});

// ============================================
// POST /api/winnings - Get user winnings (only from game wins)
// ============================================
app.post("/api/winnings", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const numericId = Number(userId);
    if (!numericId || isNaN(numericId)) {
      return res.json({ dollarWinnings: 0, starWinnings: 0 });
    }

    // Winnings = ONLY sum of win transactions
    // Deposits = sum of deposit transactions (to subtract from withdrawable)
    const dollarWins = await Transaction.aggregate([
      { $match: { telegramId: numericId, type: "win", currency: "dollar", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const starWins = await Transaction.aggregate([
      { $match: { telegramId: numericId, type: "win", currency: "star", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const dollarDeposits = await Transaction.aggregate([
      { $match: { telegramId: numericId, type: "deposit", currency: "dollar", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const starDeposits = await Transaction.aggregate([
      { $match: { telegramId: numericId, type: "deposit", currency: "star", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    return res.json({
      dollarWinnings: Math.max(0, dollarWins[0]?.total || 0),
      starWinnings: Math.max(0, starWins[0]?.total || 0),
      dollarDeposits: Math.max(0, dollarDeposits[0]?.total || 0),
      starDeposits: Math.max(0, starDeposits[0]?.total || 0),
    });
  } catch (error) {
    console.error("Winnings error:", error);
    return res.status(500).json({ error: "Failed to fetch winnings" });
  }
});

// ============================================
// NOWPayments Crypto Payment Gateway
// ============================================
const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || "";
const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || "";
const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";

// POST /api/crypto/create-payment - Create NOWPayments direct payment
app.post("/api/crypto/create-payment", async (req, res) => {
  try {
    const { userId, amount, currency } = req.body;
    if (!userId || !amount || !currency) {
      return res.status(400).json({ error: "Missing userId, amount, or currency" });
    }
    if (!NOWPAYMENTS_API_KEY) {
      return res.status(500).json({ error: "NOWPayments not configured" });
    }

    // Check minimum amount for this currency
    const minRes = await fetch(`${NOWPAYMENTS_API}/min-amount?currency_from=${currency}&currency_to=usd&fiat_equivalent=usd`, {
      headers: { "x-api-key": NOWPAYMENTS_API_KEY },
    });
    if (minRes.ok) {
      const minData = await minRes.json();
      const minUsd = minData.fiat_equivalent || null;
      if (minUsd && amount < minUsd) {
        return res.status(400).json({ 
          error: `Minimum deposit for ${currency.toUpperCase()} is $${Math.ceil(minUsd)}. Please increase your amount.` 
        });
      }
    }

    const orderId = `dep_${userId}_${Date.now()}`;

    // Use /payment endpoint for direct address (no hosted page)
    const npRes = await fetch(`${NOWPAYMENTS_API}/payment`, {
      method: "POST",
      headers: {
        "x-api-key": NOWPAYMENTS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_amount: amount,
        price_currency: "usd",
        pay_currency: currency,
        order_id: orderId,
        order_description: `Deposit $${amount} for user ${userId}`,
        ipn_callback_url: `${process.env.KOYEB_URL || "https://broken-bria-chetan1-ea890b93.koyeb.app"}/api/crypto/ipn`,
      }),
    });

    const npData = await npRes.json();
    console.log("NOWPayments /payment response:", JSON.stringify(npData));
    if (!npRes.ok) {
      console.error("NOWPayments error:", npData);
      throw new Error(npData.message || "Failed to create payment");
    }

    // Save pending transaction
    await Transaction.create({
      telegramId: Number(userId),
      type: "deposit",
      currency: "dollar",
      amount: amount,
      status: "pending",
      description: `Crypto Deposit: $${amount} via ${currency.toUpperCase()}`,
      depositComment: orderId,
      tonTxHash: String(npData.payment_id || npData.id),
    });

    return res.json({
      payAddress: npData.pay_address,
      payAmount: npData.pay_amount,
      payCurrency: npData.pay_currency,
      paymentId: npData.payment_id,
      orderId,
      expirationEstimate: npData.expiration_estimate_date,
    });
  } catch (error) {
    console.error("Crypto create-payment error:", error);
    return res.status(500).json({ error: error.message || "Failed to create crypto payment" });
  }
});

// POST /api/crypto/ipn - NOWPayments IPN (Instant Payment Notification) callback
app.post("/api/crypto/ipn", async (req, res) => {
  try {
    const data = req.body;
    console.log("📩 NOWPayments IPN:", JSON.stringify(data));

    // Verify IPN signature - NOWPayments sends signature in x-nowpayments-sig header
    if (NOWPAYMENTS_IPN_SECRET) {
      const crypto = require("crypto");
      const receivedSig = req.headers["x-nowpayments-sig"];
      console.log("🔑 Received signature header:", receivedSig ? receivedSig.substring(0, 20) + "..." : "MISSING");
      
      if (!receivedSig) {
        console.error("❌ No x-nowpayments-sig header found");
        return res.status(400).json({ error: "Missing signature header" });
      }
      
      // Use raw body to preserve exact number formatting
      const rawBody = req.rawBody;
      let rawData;
      try {
        rawData = JSON.parse(rawBody);
      } catch (e) {
        rawData = data;
      }
      const sortedKeys = Object.keys(rawData).sort();
      const sortedData = {};
      for (const k of sortedKeys) {
        sortedData[k] = rawData[k];
      }
      const hmac = crypto.createHmac("sha512", NOWPAYMENTS_IPN_SECRET)
        .update(JSON.stringify(sortedData))
        .digest("hex");
      console.log("🔑 IPN signature check - received:", receivedSig.substring(0, 20) + "...", "computed:", hmac.substring(0, 20) + "...");
      if (hmac !== receivedSig) {
        console.error("❌ IPN signature mismatch");
        console.error("Raw body:", rawBody);
        return res.status(400).json({ error: "Invalid signature" });
      }
      console.log("✅ IPN signature verified");
    }

    const { order_id, payment_status, price_amount } = data;

    if (!order_id) {
      return res.status(400).json({ error: "Missing order_id" });
    }

    // Find matching pending transaction
    const tx = await Transaction.findOne({ depositComment: order_id, status: "pending" });
    if (!tx) {
      console.log("No pending tx for order:", order_id);
      return res.sendStatus(200);
    }

    if (payment_status === "finished" || payment_status === "confirmed") {
      tx.status = "completed";
      await tx.save();

      // Credit user balance
      const user = await getOrCreateUser(tx.telegramId);
      user.dollarBalance += Number(price_amount || tx.amount);
      await user.save();

      console.log(`✅ Crypto deposit completed: $${tx.amount} for user ${tx.telegramId}`);

      // Notify user via Telegram bot
      try {
        await bot.sendMessage(tx.telegramId,
          `✅ Payment Received!\n\n💰 $${tx.amount} has been added to your wallet.\n\nOpen the game to start playing! 🎮`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "🎮 Open Game", web_app: { url: process.env.WEBAPP_URL || process.env.KOYEB_URL || "https://broken-bria-chetan1-ea890b93.koyeb.app" } }],
              ],
            },
          }
        );
      } catch (e) { console.error("Failed to notify user:", e.message); }

      // Notify owner
      try {
        await bot.sendMessage(6965488457,
          `💰 Crypto Deposit!\n\nUser: ${tx.telegramId}\nAmount: $${tx.amount}\nOrder: ${order_id}\nStatus: ${payment_status}`
        );
      } catch (e) { /* ignore */ }
    } else if (payment_status === "failed" || payment_status === "expired") {
      tx.status = "failed";
      await tx.save();
      console.log(`❌ Crypto deposit failed: ${order_id} - ${payment_status}`);
    }
    // For other statuses (waiting, confirming, sending) - do nothing, keep pending

    return res.sendStatus(200);
  } catch (error) {
    console.error("Crypto IPN error:", error);
    return res.sendStatus(200); // Always return 200 to NOWPayments
  }
});

// GET /api/crypto/currencies - Get available cryptocurrencies
app.get("/api/crypto/currencies", async (req, res) => {
  try {
    if (!NOWPAYMENTS_API_KEY) {
      // Return popular defaults if API key not set
      return res.json({ currencies: ["btc", "eth", "usdt", "ltc", "ton", "trx", "sol", "doge"] });
    }
    const npRes = await fetch(`${NOWPAYMENTS_API}/currencies`, {
      headers: { "x-api-key": NOWPAYMENTS_API_KEY },
    });
    const data = await npRes.json();
    return res.json({ currencies: data.currencies || [] });
  } catch (error) {
    return res.json({ currencies: ["btc", "eth", "usdt", "ltc", "ton", "trx", "sol", "doge"] });
  }
});

// GET /api/crypto/min-amount - Get minimum payment amount
app.get("/api/crypto/min-amount", async (req, res) => {
  try {
    const { currency } = req.query;
    if (!currency || !NOWPAYMENTS_API_KEY) {
      return res.json({ min_amount: 1 });
    }
    const npRes = await fetch(`${NOWPAYMENTS_API}/min-amount?currency_from=${currency}&currency_to=usd`, {
      headers: { "x-api-key": NOWPAYMENTS_API_KEY },
    });
    const data = await npRes.json();
    return res.json({ min_amount: data.min_amount || 1 });
  } catch (error) {
    return res.json({ min_amount: 1 });
  }
});

// POST /api/crypto/check-status - Check payment status
app.post("/api/crypto/check-status", async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: "Missing orderId" });

    const tx = await Transaction.findOne({ depositComment: orderId });
    if (!tx) return res.status(404).json({ error: "Transaction not found" });

    return res.json({ status: tx.status, amount: tx.amount });
  } catch (error) {
    return res.status(500).json({ error: "Failed to check status" });
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
