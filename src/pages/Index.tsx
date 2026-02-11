import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Coins, Gamepad2, Zap, Trophy, Target, Swords, Puzzle, Flame } from "lucide-react";
import SplashScreen from "@/components/SplashScreen";
import GameCard from "@/components/GameCard";
import BottomNav from "@/components/BottomNav";

const games = [
  { title: "Coin Rush", icon: <Coins className="h-6 w-6 text-primary" />, reward: "+500", color: "gold" as const },
  { title: "Battle Arena", icon: <Swords className="h-6 w-6 text-secondary" />, reward: "+300", color: "blue" as const },
  { title: "Puzzle Master", icon: <Puzzle className="h-6 w-6 text-primary" />, reward: "+200", color: "gold" as const },
  { title: "Speed Run", icon: <Zap className="h-6 w-6 text-secondary" />, reward: "+400", color: "blue" as const },
  { title: "Target Shot", icon: <Target className="h-6 w-6 text-primary" />, reward: "+350", color: "gold" as const },
  { title: "Fire Quest", icon: <Flame className="h-6 w-6 text-secondary" />, reward: "+250", color: "blue" as const },
];

const Index = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence>{loading && <SplashScreen />}</AnimatePresence>

      {!loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="pb-24"
        >
          {/* Header */}
          <div className="sticky top-0 z-30 border-b border-border bg-card/80 px-4 py-4 backdrop-blur-lg">
            <div className="mx-auto flex max-w-md items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
                  <span className="font-game text-sm text-background">G</span>
                </div>
                <span className="font-game text-lg text-foreground">GAMEE</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5">
                <Coins className="h-4 w-4 text-primary" />
                <span className="font-game text-sm text-primary">2,450</span>
              </div>
            </div>
          </div>

          {/* Banner */}
          <div className="px-4 pt-4">
            <div className="mx-auto max-w-md">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 p-4"
              >
                <div className="flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-primary animate-float" />
                  <div>
                    <h2 className="font-game text-sm text-foreground">Daily Challenge</h2>
                    <p className="text-xs text-muted-foreground">Play 3 games to earn bonus coins!</p>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: "33%" }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                  />
                </div>
                <p className="mt-1 text-right text-[10px] text-muted-foreground">1/3 completed</p>
              </motion.div>
            </div>
          </div>

          {/* Games Grid */}
          <div className="px-4 pt-5">
            <div className="mx-auto max-w-md">
              <h2 className="mb-3 font-game text-sm tracking-wider text-muted-foreground">
                🎮 PLAY & EARN
              </h2>
              <div className="grid grid-cols-1 gap-3">
                {games.map((game, i) => (
                  <GameCard key={game.title} {...game} delay={0.1 * i} />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {!loading && <BottomNav />}
    </div>
  );
};

export default Index;
