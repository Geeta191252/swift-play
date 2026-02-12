import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, DollarSign, Star } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { isTelegramMiniApp, initiatePayment, fetchTransactions, type CurrencyType, type ActionType } from "@/lib/telegram";
import { useBalanceContext } from "@/contexts/BalanceContext";
import AmountInputDialog from "./AmountInputDialog";

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

  const { dollarBalance, starBalance, refreshBalance } = useBalanceContext();

  const { data: transactions = fallbackTransactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: fetchTransactions,
    placeholderData: fallbackTransactions,
    retry: 1,
  });

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

      {/* Actions */}
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
            onClick={() => { setWithdrawMenu(!withdrawMenu); setDepositMenu(false); }}
          >
            <ArrowUpRight className="h-4 w-4 mr-2" /> Withdraw
          </Button>
          <CurrencyMenu show={withdrawMenu} onSelect={handleWithdraw} onClose={() => setWithdrawMenu(false)} />
        </div>
      </div>

      {/* Transactions */}
      <div>
        <h3 className="font-semibold text-foreground text-sm mb-3">Recent Transactions</h3>
        <div className="space-y-2">
          {transactions.map((tx, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3"
            >
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                tx.type === "win" || tx.type === "bonus" ? "bg-green-500/20" : "bg-red-500/20"
              }`}>
                {tx.type === "win" || tx.type === "bonus" ? (
                  <ArrowDownLeft className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowUpRight className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-foreground">{tx.game}</h4>
                <p className="text-xs text-muted-foreground">{tx.time}</p>
              </div>
              <span className={`text-sm font-bold ${
                tx.amount.startsWith("+") ? "text-green-500" : "text-red-500"
              }`}>
                {tx.currency} {tx.amount}
              </span>
            </motion.div>
          ))}
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
