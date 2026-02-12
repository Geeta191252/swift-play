import { motion } from "framer-motion";
import { Copy, Send } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "@/hooks/use-toast";

const inviteTasks = [
  { title: "Invite 1st friend", reward: "2", icon: "⭐" },
  { title: "Invite 2nd friend", reward: "3", icon: "⭐" },
  { title: "Invite 3rd friend", reward: "3", icon: "⭐" },
];

const FriendsScreen = () => {
  const referralLink = "https://t.me/gamee/start?startapp=eyJy...";

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
  };

  return (
    <div className="px-4 pt-6 space-y-5">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="font-extrabold text-2xl text-foreground">Build your team!</h2>
        <p className="text-muted-foreground text-sm">Share the fun and get rewards.</p>
      </div>

      {/* Referral Link Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/60 border border-border/50 rounded-2xl p-4 space-y-3"
      >
        <p className="text-xs text-muted-foreground">Your referral link</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-muted/30 border border-border/40 rounded-xl px-4 py-2.5 font-mono text-sm text-foreground truncate">
            {referralLink}
          </div>
          <Button size="icon" variant="ghost" onClick={copyLink} className="rounded-xl h-10 w-10 shrink-0">
            <Copy className="h-5 w-5" />
          </Button>
        </div>
        <Button
          className="w-full rounded-2xl h-12 text-base font-extrabold uppercase tracking-wide bg-yellow-400 hover:bg-yellow-500 text-black border-2 border-yellow-500"
          onClick={copyLink}
        >
          <Send className="h-5 w-5 mr-2" /> Invite Friends
        </Button>
      </motion.div>

      {/* Invite Tasks */}
      <div className="space-y-3">
        {inviteTasks.map((task, i) => (
          <motion.div
            key={task.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-3 p-3 rounded-2xl bg-card/60 border border-border/50"
          >
            <div className="h-14 w-14 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 text-3xl">
              🧑‍🤝‍🧑
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-foreground">{task.title}</h4>
            </div>
            <span className="text-xl font-bold text-foreground shrink-0">{task.reward}</span>
            <span className="text-lg shrink-0">{task.icon}</span>
          </motion.div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center px-2">
        📌 Note: After the 3rd referral, you will earn 3 ⭐ for every referral!
      </p>
    </div>
  );
};

export default FriendsScreen;
