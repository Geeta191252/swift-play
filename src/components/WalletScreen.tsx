import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Diamond, Star } from "lucide-react";
import { Button } from "./ui/button";

const transactions = [
  { type: "win", game: "Greedy King", amount: "+250", currency: "💎", time: "2 min ago" },
  { type: "bet", game: "Greedy King", amount: "-100", currency: "💎", time: "5 min ago" },
  { type: "win", game: "Lucky Slots", amount: "+80", currency: "⭐", time: "1 hr ago" },
  { type: "bonus", game: "Daily Login", amount: "+50", currency: "💎", time: "3 hr ago" },
  { type: "bet", game: "Dice Master", amount: "-200", currency: "⭐", time: "5 hr ago" },
];

const WalletScreen = () => {
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
            <Diamond className="h-3.5 w-3.5" /> Diamonds
          </div>
          <p className="font-bold text-2xl text-foreground">7,570</p>
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
          <p className="font-bold text-2xl text-foreground">1,200</p>
        </motion.div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="rounded-xl h-12">
          <ArrowDownLeft className="h-4 w-4 mr-2" /> Deposit
        </Button>
        <Button variant="outline" className="rounded-xl h-12">
          <ArrowUpRight className="h-4 w-4 mr-2" /> Withdraw
        </Button>
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
    </div>
  );
};

export default WalletScreen;
