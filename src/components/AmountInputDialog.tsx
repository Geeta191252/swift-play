import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface AmountInputDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  currency: "dollar" | "star";
  action: "deposit" | "withdraw";
}

const DOLLAR_PRESETS = [1, 5, 10, 50];
const STAR_PRESETS = [100, 500, 1000, 5000];

const AmountInputDialog = ({ open, onClose, onConfirm, currency, action }: AmountInputDialogProps) => {
  const [amount, setAmount] = useState("");
  const presets = currency === "dollar" ? DOLLAR_PRESETS : STAR_PRESETS;
  const symbol = currency === "dollar" ? "$" : "⭐";

  const handleConfirm = () => {
    const num = parseFloat(amount);
    if (num > 0) {
      onConfirm(num);
      setAmount("");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 bg-card border border-border rounded-2xl p-5 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-foreground">
                {action === "deposit" ? "Deposit" : "Withdraw"} {symbol}
              </h3>
              <button onClick={onClose} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Preset amounts */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {presets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmount(String(preset))}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                    amount === String(preset)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-foreground hover:bg-muted/50"
                  }`}
                >
                  {currency === "dollar" ? `$${preset}` : `${preset} ⭐`}
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div className="mb-4">
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
                Custom Amount
              </label>
              <Input
                type="number"
                placeholder={`Enter amount in ${currency === "dollar" ? "dollars" : "stars"}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="rounded-xl bg-muted/30"
                min="1"
              />
            </div>

            <Button
              onClick={handleConfirm}
              disabled={!amount || parseFloat(amount) <= 0}
              className="w-full rounded-xl h-12 font-bold text-base"
            >
              {action === "deposit" ? "Deposit" : "Withdraw"}{" "}
              {amount ? (currency === "dollar" ? `$${amount}` : `${amount} ⭐`) : ""}
            </Button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AmountInputDialog;
