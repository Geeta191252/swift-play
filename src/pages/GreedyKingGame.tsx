import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BarChart3, CircleHelp, Diamond, ChevronRight, History, Home, Trophy, Volume2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FOOD_ITEMS = [
  { emoji: "🌭", name: "Hot Dog", multiplier: 10, color: "#FF6B35" },
  { emoji: "🥩", name: "BBQ", multiplier: 15, color: "#C41E3A" },
  { emoji: "🍗", name: "Chicken", multiplier: 25, color: "#D4A574" },
  { emoji: "🥓", name: "Steak", multiplier: 45, color: "#8B0000" },
  { emoji: "🌽", name: "Corn", multiplier: 5, color: "#FFD700" },
  { emoji: "🥬", name: "Cabbage", multiplier: 5, color: "#4CAF50" },
  { emoji: "🍅", name: "Tomato", multiplier: 5, color: "#FF4444" },
  { emoji: "🥕", name: "Carrot", multiplier: 5, color: "#FF8C00" },
];

const BET_OPTIONS = [10, 100, 1000, 10000];

const GreedyKingGame = () => {
  const navigate = useNavigate();
  const [gems, setGems] = useState(7575);
  const [todayProfits, setTodayProfits] = useState(0);
  const [selectedBet, setSelectedBet] = useState(10);
  const [selectTime, setSelectTime] = useState(3);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [results, setResults] = useState<string[]>([]);
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const [todayRound, setTodayRound] = useState(381);

  const spin = useCallback(() => {
    if (isSpinning || gems < selectedBet) return;

    setGems(prev => prev - selectedBet);
    setIsSpinning(true);
    setWinnerIndex(null);

    const winner = Math.floor(Math.random() * FOOD_ITEMS.length);
    const spins = 3 + Math.random() * 2;
    const targetRotation = rotation + (spins * 360) + (winner * 45);

    setRotation(targetRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setWinnerIndex(winner);
      const won = FOOD_ITEMS[winner];
      const winAmount = Math.random() > 0.4 ? selectedBet * (won.multiplier / 10) : 0;
      if (winAmount > 0) {
        setGems(prev => prev + winAmount);
        setTodayProfits(prev => prev + winAmount - selectedBet);
      } else {
        setTodayProfits(prev => prev - selectedBet);
      }
      setResults(prev => [won.emoji, ...prev].slice(0, 12));
      setTodayRound(prev => prev + 1);
    }, 3500);
  }, [isSpinning, gems, selectedBet, rotation]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, hsl(45 90% 65%) 0%, hsl(35 95% 55%) 100%)" }}>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-primary/20">
        <div className="flex items-center gap-1">
          {[
            { icon: Home, action: () => navigate("/") },
            { icon: Volume2 },
            { icon: CircleHelp },
            { icon: History },
            { icon: BarChart3 },
            { icon: Trophy },
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              className="h-9 w-9 rounded-lg border-2 border-primary/40 bg-primary/10 flex items-center justify-center"
            >
              <item.icon className="h-4 w-4 text-primary-foreground" />
            </button>
          ))}
        </div>
        <div className="bg-primary-foreground/90 rounded-lg px-3 py-1.5 text-right">
          <p className="text-[10px] text-muted-foreground leading-tight">Today's</p>
          <p className="font-bold text-sm text-primary-foreground leading-tight">{todayRound} Round</p>
        </div>
      </div>

      {/* Wheel Area */}
      <div className="flex-1 flex flex-col items-center relative px-4 pt-4">
        {/* Ferris Wheel */}
        <div className="relative w-[300px] h-[300px]">
          {/* Center circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-24 h-24 rounded-full border-4 border-red-600 flex flex-col items-center justify-center"
            style={{ background: "radial-gradient(circle, hsl(0 70% 50%), hsl(0 80% 40%))" }}
          >
            <span className="text-2xl">🍴</span>
            <p className="text-[10px] text-white font-bold">Select time</p>
            <p className="text-xl font-bold text-white">{selectTime}</p>
            {/* Dots around */}
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-yellow-300"
                style={{
                  top: `${50 - 46 * Math.cos((i * 22.5 * Math.PI) / 180)}%`,
                  left: `${50 + 46 * Math.sin((i * 22.5 * Math.PI) / 180)}%`,
                  transform: "translate(-50%, -50%)",
                }}
              />
            ))}
          </div>

          {/* Spokes */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 300">
            {FOOD_ITEMS.map((_, i) => {
              const angle = (i * 45 - 90) * (Math.PI / 180);
              const cx = 150, cy = 150, r = 105;
              const x = cx + r * Math.cos(angle);
              const y = cy + r * Math.sin(angle);
              return (
                <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="hsl(200 80% 55%)" strokeWidth="4" />
              );
            })}
          </svg>

          {/* Food items around the wheel */}
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: rotation }}
            transition={{ duration: 3.5, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {FOOD_ITEMS.map((food, i) => {
              const angle = (i * 45 - 90) * (Math.PI / 180);
              const r = 115;
              const x = 150 + r * Math.cos(angle);
              const y = 150 + r * Math.sin(angle);
              return (
                <div
                  key={i}
                  className="absolute flex flex-col items-center"
                  style={{
                    left: x,
                    top: y,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div className={`w-16 h-16 rounded-full border-[3px] border-blue-600 bg-white flex items-center justify-center shadow-lg ${winnerIndex === i ? "ring-4 ring-yellow-400 scale-110" : ""}`}
                    style={{ transition: "all 0.3s" }}
                  >
                    <span className="text-2xl">{food.emoji}</span>
                  </div>
                  <span className="text-[9px] font-bold text-primary-foreground mt-0.5 bg-blue-100/80 px-1.5 rounded-full whitespace-nowrap">
                    Win {food.multiplier} times
                  </span>
                  {i === 0 && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[8px] font-bold px-1.5 rounded-full">
                      Hot
                    </span>
                  )}
                </div>
              );
            })}
          </motion.div>

          {/* Stand/base */}
          <div className="absolute bottom-[-30px] left-1/2 -translate-x-1/2 w-40 h-16 rounded-t-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(180deg, hsl(200 70% 55%), hsl(210 70% 45%))" }}
          >
            {/* Spin button finger pointer */}
            <motion.button
              onClick={spin}
              disabled={isSpinning}
              whileTap={{ scale: 0.9 }}
              className="text-3xl cursor-pointer disabled:opacity-50"
            >
              👆
            </motion.button>
          </div>
        </div>

        {/* Category buttons */}
        <div className="flex items-center justify-between w-full mt-10 px-2">
          <button className="flex items-center gap-1 bg-white/80 rounded-full px-3 py-1.5 text-xs font-bold text-primary-foreground">
            🥗 Salad <ChevronRight className="h-3 w-3" />
          </button>
          <button className="flex items-center gap-1 bg-white/80 rounded-full px-3 py-1.5 text-xs font-bold text-primary-foreground">
            🍕 Pizza <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {/* Bet Options */}
        <div className="w-full mt-4 rounded-2xl p-3 flex gap-2 justify-center"
          style={{ background: "linear-gradient(180deg, hsl(200 70% 55%), hsl(210 70% 45%))" }}
        >
          {BET_OPTIONS.map((bet) => (
            <motion.button
              key={bet}
              whileTap={{ scale: 0.95 }}
              onClick={() => !isSpinning && setSelectedBet(bet)}
              className={`flex-1 rounded-xl p-2 flex flex-col items-center gap-1 border-2 transition-all ${
                selectedBet === bet
                  ? "border-yellow-400 bg-red-500 shadow-lg scale-105"
                  : "border-blue-300/40 bg-blue-400/40"
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                selectedBet === bet ? "bg-yellow-400 text-red-700" : "bg-yellow-300/60 text-blue-900"
              }`}>
                {bet >= 1000 ? `${bet / 1000}K` : bet}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Gems & Profits */}
        <div className="w-full flex gap-2 mt-3">
          <div className="flex-1 bg-white/90 rounded-full px-4 py-2.5 flex items-center justify-center gap-2">
            <span className="text-xs font-semibold text-gray-600">Gems left</span>
            <Diamond className="h-3.5 w-3.5 text-primary" />
            <span className="font-bold text-sm text-primary-foreground">{gems.toLocaleString()}</span>
            <ChevronRight className="h-3 w-3 text-gray-400" />
          </div>
          <div className="flex-1 bg-white/90 rounded-full px-4 py-2.5 flex items-center justify-center gap-2">
            <span className="text-xs font-semibold text-gray-600">Today's Profits</span>
            <Diamond className="h-3.5 w-3.5 text-primary" />
            <span className={`font-bold text-sm ${todayProfits >= 0 ? "text-green-600" : "text-red-500"}`}>
              {todayProfits}
            </span>
          </div>
        </div>

        {/* Results */}
        <div className="w-full mt-3 bg-red-500/90 rounded-2xl p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">Result</span>
            <span className="bg-green-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">New</span>
          </div>
          <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-hide">
            {results.length > 0 ? results.map((emoji, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 border border-red-300"
              >
                <span className="text-sm">{emoji}</span>
              </motion.div>
            )) : (
              <p className="text-white/60 text-xs">Spin to see results...</p>
            )}
          </div>
        </div>

        {/* Today's Ranking */}
        <div className="w-full mt-3 mb-6 bg-white/90 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <Trophy className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm text-primary-foreground">Today's Betting Ranking</p>
            <div className="flex items-center gap-1">
              <Diamond className="h-3 w-3 text-primary" />
              <span className="text-xs text-muted-foreground font-semibold">6,471,680</span>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Win popup */}
      <AnimatePresence>
        {winnerIndex !== null && !isSpinning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setWinnerIndex(null)}
          >
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              className="bg-white rounded-3xl p-6 mx-8 text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-6xl">{FOOD_ITEMS[winnerIndex].emoji}</span>
              <h3 className="font-bold text-xl mt-3 text-primary-foreground">{FOOD_ITEMS[winnerIndex].name}!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Win {FOOD_ITEMS[winnerIndex].multiplier} times multiplier
              </p>
              <button
                onClick={() => setWinnerIndex(null)}
                className="mt-4 bg-primary text-primary-foreground font-bold px-8 py-2.5 rounded-full text-sm"
              >
                Continue
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GreedyKingGame;
