import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import createAdHandler from "monetag-tg-sdk";
import clapperboardIcon from "@/assets/icon-clapperboard.png";
import { useBalanceContext } from "@/contexts/BalanceContext";
import { getTelegramUser } from "@/lib/telegram";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://broken-bria-chetan1-ea890b93.koyeb.app/api";

// Initialize Monetag ad handler with zone ID
const adHandler = createAdHandler(10648653);

const tasks = [
  {
    title: "Watch short ads",
    subtitle: "Rewarded Interstitial",
    emoji: "🤩",
    maxAds: 5,
  },
  {
    title: "Click to get reward",
    subtitle: "Rewarded Popup",
    emoji: "😎",
    maxAds: 7,
  },
];

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const loadTodayCounts = (): number[] => {
  try {
    const saved = localStorage.getItem("earn_ad_counts");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.date === getTodayKey()) return parsed.counts;
    }
  } catch {}
  return tasks.map(() => 0);
};

const saveTodayCounts = (counts: number[]) => {
  localStorage.setItem("earn_ad_counts", JSON.stringify({ date: getTodayKey(), counts }));
};

const EarnScreen = () => {
  const [adCounts, setAdCounts] = useState<number[]>(loadTodayCounts);
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const { refreshBalance } = useBalanceContext();

  const handleClaim = async (idx: number) => {
    if (loadingIdx !== null) return;
    if (adCounts[idx] >= tasks[idx].maxAds) {
      toast.info("Today's limit reached! Come back tomorrow.");
      return;
    }

    setLoadingIdx(idx);
    try {
      const user = getTelegramUser();
      const userId = user?.id || "demo";

      await adHandler(String(userId));

      const newCounts = [...adCounts];
      newCounts[idx] += 1;
      setAdCounts(newCounts);
      saveTodayCounts(newCounts);

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
      toast.success(`Ad complete! +1 ⭐ earned (${newCounts[idx]}/${tasks[idx].maxAds})`);
    } catch {
      toast.info("Ad skipped or closed.");
    } finally {
      setLoadingIdx(null);
    }
  };

  const totalWatched = adCounts.reduce((a, b) => a + b, 0);

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
            className="flex items-center gap-3 p-3 rounded-2xl border border-border/50"
            style={{ background: "linear-gradient(135deg, hsl(40 90% 55%), hsl(35 85% 50%))" }}
          >
            <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 text-3xl" style={{ background: "hsla(0,0%,100%,0.25)" }}>
              {task.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm truncate" style={{ color: "hsl(0,0%,10%)" }}>
                {task.title}
              </h4>
              <p className="text-xs truncate" style={{ color: "hsla(0,0%,10%,0.6)" }}>
                {task.subtitle} — {adCounts[i]}/{task.maxAds}
              </p>
            </div>
            {adCounts[i] >= task.maxAds ? (
              <span className="px-4 py-1.5 rounded-full text-sm font-bold shrink-0"
                style={{ background: "hsl(120,60%,40%)", color: "white" }}>
                ✅ Done
              </span>
            ) : (
              <button
                onClick={() => handleClaim(i)}
                disabled={loadingIdx !== null}
                className="px-4 py-1.5 rounded-full text-sm font-bold shrink-0 active:scale-95 transition-transform"
                style={{
                  background: loadingIdx === i ? "hsl(0,0%,70%)" : "hsl(0,0%,100%)",
                  color: "hsl(0,0%,10%)",
                  border: "2px solid hsl(0,0%,85%)",
                }}
              >
                {loadingIdx === i ? "..." : "Claim"}
              </button>
            )}
          </motion.div>
        ))}
      </div>

      <p className="text-center text-sm font-semibold text-foreground">
        Ads Watched Today: {totalWatched} / {tasks.reduce((a, t) => a + t.maxAds, 0)} 🎬
      </p>

      <div className="text-xs text-muted-foreground text-center px-2 space-y-1">
        <p>📌 1 ad dekhne par 1 ⭐ milega!</p>
        <p>📌 Watch 1 ad to earn 1 ⭐!</p>
        <p>💰 Ads se milne wale stars aapke ⭐ Star wallet mein add honge.</p>
      </div>
    </div>
  );
};

export default EarnScreen;
