import { motion } from "framer-motion";
import { Copy, Share2, UserPlus, Users } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "@/hooks/use-toast";

const friends = [
  { name: "Aarav", level: 12, earned: "💎 340" },
  { name: "Priya", level: 8, earned: "💎 120" },
  { name: "Rahul", level: 15, earned: "💎 500" },
];

const FriendsScreen = () => {
  const referralCode = "KING2026";

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast({ title: "Copied!", description: "Referral code copied to clipboard" });
  };

  return (
    <div className="px-4 pt-4 space-y-5">
      <h2 className="font-bold text-xl text-foreground">Friends & Refer</h2>

      {/* Referral Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-2xl p-5 space-y-3"
      >
        <div className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-foreground">Refer & Earn 💎 200</h3>
        </div>
        <p className="text-sm text-muted-foreground">Share your code with friends. When they join, you both earn rewards!</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-card border border-border rounded-xl px-4 py-2.5 font-mono font-bold text-foreground text-center tracking-widest">
            {referralCode}
          </div>
          <Button size="icon" variant="outline" onClick={copyCode} className="rounded-xl h-10 w-10">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <Button className="w-full rounded-xl" onClick={copyCode}>
          <UserPlus className="h-4 w-4 mr-2" /> Invite Friends
        </Button>
      </motion.div>

      {/* Friends List */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground text-sm">Your Friends ({friends.length})</h3>
        </div>
        <div className="space-y-2">
          {friends.map((f, i) => (
            <motion.div
              key={f.name}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3"
            >
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm">
                {f.name[0]}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-foreground">{f.name}</h4>
                <p className="text-xs text-muted-foreground">Level {f.level}</p>
              </div>
              <span className="text-sm font-bold text-primary">{f.earned}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FriendsScreen;
