import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, DollarSign, Star, ArrowRightLeft, Wallet, Unplug } from "lucide-react";
import { useTonConnectUI, useTonWallet, useTonAddress } from "@tonconnect/ui-react";
// @ton/core is dynamically imported where needed to avoid Buffer polyfill issues
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { isTelegramMiniApp, initiatePayment, fetchTransactions, fetchWinnings, getTelegram, type CurrencyType, type ActionType } from "@/lib/telegram";
import { useBalanceContext } from "@/contexts/BalanceContext";
import AmountInputDialog from "./AmountInputDialog";

const STAR_TO_DOLLAR_RATE = 100; // 100 ⭐ = $1

const fallbackTransactions = [
  { type: "win", game: "Greedy King", amount: "+250", currency: "💲", time: "2 min ago" },
  { type: "bet", game: "Greedy King", amount: "-100", currency: "💲", time: "5 min ago" },
  { type: "win", game: "Lucky Slots", amount: "+80", currency: "⭐", time: "1 hr ago" },
  { type: "bonus", game: "Daily Login", amount: "+50", currency: "💲", time: "3 hr ago" },
  { type: "bet", game: "Dice Master", amount: "-200", currency: "⭐", time: "5 hr ago" },
];

type CurrencyOption = "dollar" | "star";

interface CurrencyMenuProps {
  show: boolean;
  onSelect: (currency: CurrencyOption) => void;
  onClose: () => void;
}

const CurrencyMenu = ({ show, onSelect, onClose }: CurrencyMenuProps) => (
  <AnimatePresence>
    {show && (
      <>
        <div className="fixed inset-0 z-40" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
          className="absolute top-full mt-2 left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-lg overflow-hidden"
        >
          <button
            onClick={() => onSelect("dollar")}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            <span className="text-lg">💲</span>
            <span className="font-semibold text-sm text-foreground">Dollar ($)</span>
          </button>
          <div className="h-px bg-border" />
          <button
            onClick={() => onSelect("star")}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            <span className="text-lg">⭐</span>
            <span className="font-semibold text-sm text-foreground">Star (⭐)</span>
          </button>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

const WalletScreen = () => {
  const [depositMenu, setDepositMenu] = useState(false);
  const [withdrawMenu, setWithdrawMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amountDialog, setAmountDialog] = useState<{
    open: boolean;
    action: ActionType;
    currency: CurrencyType;
  }>({ open: false, action: "deposit", currency: "dollar" });

  // Converter state
  const [convertStars, setConvertStars] = useState("");
  const [converting, setConverting] = useState(false);

  // TON Connect
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const tonAddress = useTonAddress(false);

  // TON deposit/withdraw state
  const [tonDepositAmount, setTonDepositAmount] = useState("");
  const [tonWithdrawAmount, setTonWithdrawAmount] = useState("");
  const [tonProcessing, setTonProcessing] = useState(false);
  const [tonPrice, setTonPrice] = useState<number | null>(null);

  const { dollarBalance, starBalance, refreshBalance } = useBalanceContext();

  const apiBase = import.meta.env.VITE_API_BASE_URL || "https://broken-bria-chetan1-ea890b93.koyeb.app/api";

  const { data: transactions = fallbackTransactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: fetchTransactions,
    placeholderData: fallbackTransactions,
    retry: 1,
  });

  // Fetch winnings (only from game wins)
  const { data: winnings } = useQuery({
    queryKey: ["winnings"],
    queryFn: fetchWinnings,
    placeholderData: { dollarWinnings: 0, starWinnings: 0 },
    retry: 1,
    refetchInterval: 30000,
  });

  const dollarWinnings = winnings?.dollarWinnings ?? 0;
  const starWinnings = winnings?.starWinnings ?? 0;

  // Fetch TON price
  useQuery({
    queryKey: ["ton-price"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/ton/price`);
      const data = await res.json();
      setTonPrice(data.tonUsdPrice);
      return data.tonUsdPrice;
    },
    refetchInterval: 60000,
  });

  // ---- TON Deposit Handler ----
  const handleTonDeposit = async () => {
    const tonAmt = Number(tonDepositAmount);
    if (!tonAmt || tonAmt <= 0) {
      toast({ title: "Invalid amount", description: "Enter a valid TON amount.", variant: "destructive" });
      return;
    }
    if (!tonAddress) {
      toast({ title: "Wallet not connected", description: "Connect your TON wallet first.", variant: "destructive" });
      return;
    }

    setTonProcessing(true);
    try {
      const tg = getTelegram();
      const userId = tg?.initDataUnsafe?.user?.id || "demo";

      // Step 1: Init deposit on backend → get owner wallet & comment
      const initRes = await fetch(`${apiBase}/ton/init-deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tonAmount: tonAmt }),
      });
      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error || "Failed to init deposit");

      // Step 2: Send TON via TonConnect
      const nanoTon = BigInt(Math.floor(tonAmt * 1e9)).toString();

      // Dynamically import @ton/core to avoid Buffer issues at module load
      const { beginCell } = await import("@ton/core");
      const body = beginCell()
        .storeUint(0, 32) // comment opcode
        .storeStringTail(initData.depositComment)
        .endCell();
      const payloadBase64 = body.toBoc().toString("base64");

      const txResult = await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          {
            address: initData.ownerWallet,
            amount: nanoTon,
            payload: payloadBase64,
          },
        ],
      });

      // Step 3: Confirm deposit on backend
      const confirmRes = await fetch(`${apiBase}/ton/confirm-deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          transactionId: initData.transactionId,
          bocHash: txResult.boc || "confirmed",
        }),
      });
      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) throw new Error(confirmData.error || "Failed to confirm deposit");

      toast({
        title: "TON Deposit Successful! ✅",
        description: `${tonAmt} TON ≈ $${initData.usdEquivalent.toFixed(2)} added to your wallet!`,
      });
      setTonDepositAmount("");
      refreshBalance();
    } catch (err: any) {
      if (err?.message?.includes("Rejected")) {
        toast({ title: "Cancelled", description: "Transaction was cancelled." });
      } else {
        toast({ title: "Error", description: err?.message || "TON deposit failed.", variant: "destructive" });
      }
    } finally {
      setTonProcessing(false);
    }
  };

  // ---- TON Withdraw Handler ----
  const handleTonWithdraw = async () => {
    const dollarAmt = Number(tonWithdrawAmount);
    if (!dollarAmt || dollarAmt < 10) {
      toast({ title: "Minimum $10", description: "Minimum withdrawal is $10.", variant: "destructive" });
      return;
    }
    if (dollarAmt > dollarBalance) {
      toast({ title: "Insufficient balance", description: "You don't have enough dollar balance.", variant: "destructive" });
      return;
    }
    if (!tonAddress) {
      toast({ title: "Wallet not connected", description: "Connect your TON wallet first.", variant: "destructive" });
      return;
    }

    setTonProcessing(true);
    try {
      const tg = getTelegram();
      const userId = tg?.initDataUnsafe?.user?.id || "demo";

      const res = await fetch(`${apiBase}/ton/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, dollarAmount: dollarAmt, tonWalletAddress: tonAddress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Withdrawal failed");

      toast({
        title: "Withdrawal Submitted! ✅",
        description: `$${dollarAmt} ≈ ${data.tonAmount.toFixed(4)} TON will be sent to your wallet.`,
      });
      setTonWithdrawAmount("");
      refreshBalance();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Withdrawal failed.", variant: "destructive" });
    } finally {
      setTonProcessing(false);
    }
  };

  const handleCurrencySelect = (action: ActionType, currency: CurrencyType) => {
    if (action === "deposit") setDepositMenu(false);
    else setWithdrawMenu(false);
    setAmountDialog({ open: true, action, currency });
  };

  const handleAmountConfirm = async (amount: number) => {
    const { action, currency } = amountDialog;
    setAmountDialog((prev) => ({ ...prev, open: false }));

    setLoading(true);
    try {
      await initiatePayment(action, currency, amount, (status) => {
        setLoading(false);
        if (status === "paid") {
          toast({
            title: "Success! ✅",
            description: `${action === "deposit" ? "Deposit" : "Withdrawal"} of ${currency === "dollar" ? "$" + amount : amount + " ⭐"} completed!`,
          });
          refreshBalance();
        } else if (status === "cancelled") {
          toast({ title: "Cancelled", description: "Payment was cancelled." });
        } else {
          toast({ title: "Failed", description: "Payment failed. Try again.", variant: "destructive" });
        }
      });
    } catch (err: any) {
      setLoading(false);
      const message = err?.message || "Could not connect to server.";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const handleDeposit = (currency: CurrencyOption) => handleCurrencySelect("deposit", currency as CurrencyType);
  const handleWithdraw = (currency: CurrencyOption) => handleCurrencySelect("withdraw", currency as CurrencyType);

  const starInputNum = Number(convertStars) || 0;
  const dollarOutput = (starInputNum / STAR_TO_DOLLAR_RATE).toFixed(2);

  const handleConvert = async () => {
    if (starInputNum < STAR_TO_DOLLAR_RATE) {
      toast({ title: "Minimum required", description: `Minimum ${STAR_TO_DOLLAR_RATE} ⭐ needed to convert.`, variant: "destructive" });
      return;
    }
    if (starInputNum > starBalance) {
      toast({ title: "Insufficient Stars", description: "You don't have enough Stars.", variant: "destructive" });
      return;
    }

    setConverting(true);
    try {
      const tg = getTelegram();
      const userId = tg?.initDataUnsafe?.user?.id || "demo";
      const apiBase = import.meta.env.VITE_API_BASE_URL || "https://broken-bria-chetan1-ea890b93.koyeb.app/api";
      const res = await fetch(`${apiBase}/convert-stars`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, starAmount: starInputNum }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Conversion failed");

      toast({
        title: "Converted! ✅",
        description: `${starInputNum} ⭐ → $${dollarOutput} added to your Dollar wallet.`,
      });
      setConvertStars("");
      refreshBalance();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Conversion failed.", variant: "destructive" });
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="px-4 pt-4 space-y-5">
      <h2 className="font-bold text-xl text-foreground">Wallet</h2>

      {/* Balances */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-4 space-y-1"
        >
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
            <DollarSign className="h-3.5 w-3.5" /> Dollar ($)
          </div>
          <p className="font-bold text-2xl text-foreground">${dollarBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card border border-border rounded-2xl p-4 space-y-1"
        >
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
            <Star className="h-3.5 w-3.5" /> Stars
          </div>
          <p className="font-bold text-2xl text-foreground">{starBalance.toLocaleString()}</p>
        </motion.div>
      </div>

      {/* TON Wallet */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="bg-card border border-border rounded-2xl p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">TON Wallet</h3>
          </div>
          {wallet ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-destructive hover:text-destructive"
              onClick={() => tonConnectUI.disconnect()}
            >
              <Unplug className="h-3 w-3 mr-1" /> Disconnect
            </Button>
          ) : null}
        </div>

        {wallet ? (
          <div className="space-y-3">
            <div className="bg-muted/50 border border-border rounded-xl px-3 py-2">
              <p className="text-xs text-muted-foreground">Connected Address</p>
              <p className="text-xs font-mono text-foreground truncate">
                {tonAddress ? `${tonAddress.slice(0, 6)}...${tonAddress.slice(-6)}` : "Loading..."}
              </p>
              {tonPrice && (
                <p className="text-xs text-muted-foreground mt-1">TON Price: ${tonPrice.toFixed(2)}</p>
              )}
            </div>

            {/* TON Deposit */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">Deposit TON → Get $</p>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    type="number"
                    placeholder="TON amount"
                    value={tonDepositAmount}
                    onChange={(e) => setTonDepositAmount(e.target.value)}
                    className="pr-12 rounded-xl bg-background"
                    min={0.01}
                    step={0.01}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">TON</span>
                </div>
                <Button
                  className="rounded-xl"
                  disabled={tonProcessing || !tonDepositAmount}
                  onClick={handleTonDeposit}
                >
                  {tonProcessing ? "..." : <ArrowDownLeft className="h-4 w-4" />}
                </Button>
              </div>
              {tonDepositAmount && tonPrice && (
                <p className="text-xs text-muted-foreground">
                  ≈ ${(Number(tonDepositAmount) * tonPrice).toFixed(2)} will be added
                </p>
              )}
            </div>

            {/* TON Withdraw */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">Withdraw $ → Get TON</p>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    type="number"
                    placeholder="Min $10"
                    value={tonWithdrawAmount}
                    onChange={(e) => setTonWithdrawAmount(e.target.value)}
                    className="pr-8 rounded-xl bg-background"
                    min={10}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                </div>
                <Button
                  className="rounded-xl"
                  disabled={tonProcessing || !tonWithdrawAmount}
                  onClick={handleTonWithdraw}
                >
                  {tonProcessing ? "..." : <ArrowUpRight className="h-4 w-4" />}
                </Button>
              </div>
              {tonWithdrawAmount && tonPrice && Number(tonWithdrawAmount) >= 10 && (
                <p className="text-xs text-muted-foreground">
                  ≈ {(Number(tonWithdrawAmount) / tonPrice).toFixed(4)} TON will be sent
                </p>
              )}
            </div>
          </div>
        ) : (
          <Button
            className="w-full rounded-xl h-11"
            onClick={() => tonConnectUI.openModal()}
          >
            <Wallet className="h-4 w-4 mr-2" /> Connect TON Wallet
          </Button>
        )}
      </motion.div>

      {/* Winning Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="rounded-xl h-14 w-full border-green-500/30 text-green-500 hover:bg-green-500/10 flex flex-col items-center justify-center gap-0.5"
          onClick={() => {
            if (dollarWinnings < 10) {
              toast({ title: "Minimum $10", description: "You need at least $10 in winnings to withdraw.", variant: "destructive" });
              return;
            }
            handleCurrencySelect("withdraw", "dollar");
          }}
        >
          <span className="flex items-center text-xs">
            <DollarSign className="h-3.5 w-3.5 mr-0.5" /> Winning Withdraw
          </span>
          <span className="text-sm font-bold">${dollarWinnings.toFixed(2)}</span>
        </Button>
        <Button
          variant="outline"
          className="rounded-xl h-14 w-full border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 flex flex-col items-center justify-center gap-0.5"
          onClick={() => {
            const el = document.getElementById("star-converter");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <span className="flex items-center text-xs">
            <Star className="h-3.5 w-3.5 mr-0.5" /> Winning Star Convert
          </span>
          <span className="text-sm font-bold">⭐ {starWinnings.toLocaleString()}</span>
        </Button>
      </div>

      {/* Deposit & Withdraw */}
      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <Button
            variant="outline"
            className="rounded-xl h-12 w-full"
            onClick={() => { setDepositMenu(!depositMenu); setWithdrawMenu(false); }}
          >
            <ArrowDownLeft className="h-4 w-4 mr-2" /> Deposit
          </Button>
          <CurrencyMenu show={depositMenu} onSelect={handleDeposit} onClose={() => setDepositMenu(false)} />
        </div>
        <div className="relative">
          <Button
            variant="outline"
            className="rounded-xl h-12 w-full"
            onClick={() => handleCurrencySelect("withdraw", "dollar")}
          >
            <ArrowUpRight className="h-4 w-4 mr-2" /> Withdraw
          </Button>
        </div>
      </div>

      {/* Star to Dollar Converter */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        id="star-converter"
        className="bg-card border border-border rounded-2xl p-4 space-y-3"
      >
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Star → Dollar Converter</h3>
        </div>
        <p className="text-xs text-muted-foreground">Rate: {STAR_TO_DOLLAR_RATE} ⭐ = $1.00</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              type="number"
              placeholder={`Min ${STAR_TO_DOLLAR_RATE}`}
              value={convertStars}
              onChange={(e) => setConvertStars(e.target.value)}
              className="pr-8 rounded-xl bg-background"
              min={STAR_TO_DOLLAR_RATE}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">⭐</span>
          </div>
          <ArrowRightLeft className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="bg-muted/50 border border-border rounded-xl px-3 py-2 min-w-[80px] text-center">
            <span className="font-bold text-sm text-foreground">${dollarOutput}</span>
          </div>
        </div>
        <Button
          className="w-full rounded-xl h-10"
          disabled={converting || starInputNum < STAR_TO_DOLLAR_RATE}
          onClick={handleConvert}
        >
          {converting ? "Converting..." : `Convert ${starInputNum > 0 ? starInputNum + " ⭐" : ""}`}
        </Button>
      </motion.div>

      {/* Transactions */}
      <div>
        <h3 className="font-semibold text-foreground text-sm mb-3">Recent Transactions</h3>
        <div className="space-y-2">
          {transactions.map((tx: any, i: number) => {
            const isPositive = tx.type === "win" || tx.type === "bonus" || tx.type === "deposit";
            const amountStr = String(tx.amount);
            const displayAmount = amountStr.startsWith("+") || amountStr.startsWith("-")
              ? amountStr
              : (isPositive ? "+" : "-") + amountStr;
            const currencySymbol = tx.currency === "dollar" || tx.currency === "💲" ? "💲" : "⭐";
            const timeDisplay = tx.time || (tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "");

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3"
              >
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                  isPositive ? "bg-green-500/20" : "bg-red-500/20"
                }`}>
                  {isPositive ? (
                    <ArrowDownLeft className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-foreground">{tx.game || tx.description || tx.type}</h4>
                  <p className="text-xs text-muted-foreground">{timeDisplay}</p>
                </div>
                <span className={`text-sm font-bold ${isPositive ? "text-green-500" : "text-red-500"}`}>
                  {currencySymbol} {displayAmount}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Amount Input Dialog */}
      <AmountInputDialog
        open={amountDialog.open}
        onClose={() => setAmountDialog((prev) => ({ ...prev, open: false }))}
        onConfirm={handleAmountConfirm}
        currency={amountDialog.currency}
        action={amountDialog.action}
      />
    </div>
  );
};

export default WalletScreen;
