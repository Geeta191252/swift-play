import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import clapperboardIcon from "@/assets/icon-clapperboard.png";
import { useBalanceContext } from "@/contexts/BalanceContext";
import { getTelegramUser } from "@/lib/telegram";

declare global {
  interface Window {
    show_10648653?: () => Promise<void>;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://broken-bria-chetan1-ea890b93.koyeb.app/api";

const tasks = [
  {
    title: "Watch ads 1/5 📺",
    subtitle: "Watch 5 ads and earn 5 ⭐",
    reward: 5,
    target: 5,
  },
  {
    title: "Watch ads 5/10 📺",
    subtitle: "Watch 10 ads and earn 5 ⭐",
    reward: 5,
    target: 10,
  },
  {
    title: "Watch ads 10/15 📺",
    subtitle: "Watch 15 ads and earn 5 ⭐",
    reward: 5,
    target: 15,
  },
];

const EarnScreen = () => {
  const [adsWatched, setAdsWatched] = useState(0);
  const [loading, setLoading] = useState(false);
  const { refreshBalance } = useBalanceContext();

  const handleWatchAd = async () => {
    if (loading) return;

    if (!window.show_10648653) {
      toast.error("Ad not ready yet, please try again in a moment.");
      return;
    }

    setLoading(true);
    try {
      await window.show_10648653();
      // Ad watched successfully — credit 1 star
      const newCount = adsWatched + 1;
      setAdsWatched(newCount);

      const user = getTelegramUser();
      const userId = user?.id || "demo";

      // Credit 1 star to backend
      await fetch(`${API_BASE_URL}/game/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          betAmount: 0,
          winAmount: 1,
          currency: "star",
          game: "ad-reward",
        }),
      });

      refreshBalance();
      toast.success(`Ad watched! +1 ⭐ earned (${newCount} total)`);

      // Check milestone rewards
      const milestone = tasks.find((t) => t.target === newCount);
      if (milestone) {
        toast.success(`🎉 Milestone! ${milestone.reward} bonus ⭐ earned!`);
      }
    } catch {
      toast.info("Ad skipped or closed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 pt-4 space-y-4">
      <h2 className="font-bold text-xl text-foreground flex items-center gap-2">
        🕹️ Daily tasks
      </h2>

      <div className="space-y-3">
        {tasks.map((task, i) => (
          <motion.div
            key={task.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-3 p-3 rounded-2xl bg-card/60 border border-border/50 cursor-pointer active:scale-[0.98] transition-transform"
            onClick={handleWatchAd}
          >
            <div className="h-14 w-14 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 p-1.5">
              <img src={clapperboardIcon} alt="Ad" className="h-full w-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-foreground truncate">
                {task.title}
              </h4>
              <p className="text-xs text-muted-foreground truncate">
                {task.subtitle}
              </p>
              <div className="w-full bg-muted/30 rounded-full h-1.5 mt-1">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min((adsWatched / task.target) * 100, 100)}%` }}
                />
              </div>
            </div>
            <span className="text-xl font-bold text-foreground shrink-0">
              {task.reward}
            </span>
            <span className="text-lg shrink-0">⭐</span>
          </motion.div>
        ))}
      </div>

      {loading && (
        <p className="text-center text-sm text-muted-foreground animate-pulse">
          ⏳ Ad loading...
        </p>
      )}

      <p className="text-center text-sm font-semibold text-foreground">
        Ads Watched Today: {adsWatched} 🎬
      </p>

      <div className="text-xs text-muted-foreground text-center px-2 space-y-1">
        <p>📌 1 ad dekhne par 1 ⭐ milega, 10 ads dekhne par 10 ⭐ milenge!</p>
        <p>📌 Watch 1 ad to earn 1 ⭐, watch 10 ads to earn 10 ⭐!</p>
        <p>💰 Ads se milne wale stars aapke ⭐ Star wallet mein add honge.</p>
        <p>💰 Stars earned from ads will be added to your ⭐ Star wallet.</p>
      </div>
    </div>
  );
};

export default EarnScreen;
