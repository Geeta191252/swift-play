import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, CircleHelp, Diamond, ChevronRight, History, Home, Trophy, Volume2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FOOD_ITEMS = [
  { emoji: "🌭", name: "Hot Dog", multiplier: 10 },
  { emoji: "🥩", name: "BBQ", multiplier: 15 },
  { emoji: "🍗", name: "Chicken", multiplier: 25 },
  { emoji: "🥓", name: "Steak", multiplier: 45 },
  { emoji: "🌽", name: "Corn", multiplier: 5 },
  { emoji: "🥬", name: "Cabbage", multiplier: 5 },
  { emoji: "🍅", name: "Tomato", multiplier: 5 },
  { emoji: "🥕", name: "Carrot", multiplier: 5 },
];

const BET_OPTIONS = [10, 100, 1000, 10000];

const GreedyKingGame = () => {
  const navigate = useNavigate();
  const [gems, setGems] = useState(7575);
  const [todayProfits, setTodayProfits] = useState(0);
  const [selectedBet, setSelectedBet] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [results, setResults] = useState<string[]>([]);
  const [showWin, setShowWin] = useState<{ emoji: string; name: string; amount: number } | null>(null);
  const [todayRound, setTodayRound] = useState(381);
  const totalRotationRef = useRef(0);

  const spin = useCallback(() => {
    if (isSpinning) return;
    if (gems < selectedBet) {
      alert("Not enough gems!");
      return;
    }

    setGems(prev => prev - selectedBet);
    setIsSpinning(true);
    setShowWin(null);

    const winnerIdx = Math.floor(Math.random() * FOOD_ITEMS.length);
    // Each item is 45 degrees apart. We want the winner to land at the top (0 deg position).
    // Add extra full spins for visual effect
    const extraSpins = 4 + Math.floor(Math.random() * 3); // 4-6 full rotations
    const targetAngle = totalRotationRef.current + (extraSpins * 360) + (360 - (winnerIdx * 45));
    
    totalRotationRef.current = targetAngle;
    setWheelAngle(targetAngle);

    setTimeout(() => {
      setIsSpinning(false);
      const won = FOOD_ITEMS[winnerIdx];
      const isWin = Math.random() > 0.35;
      const winAmount = isWin ? Math.round(selectedBet * (won.multiplier / 10)) : 0;
      
      if (winAmount > 0) {
        setGems(prev => prev + winAmount);
        setTodayProfits(prev => prev + (winAmount - selectedBet));
        setShowWin({ emoji: won.emoji, name: won.name, amount: winAmount });
      } else {
        setTodayProfits(prev => prev - selectedBet);
        setShowWin({ emoji: won.emoji, name: won.name, amount: 0 });
      }
      setResults(prev => [won.emoji, ...prev].slice(0, 12));
      setTodayRound(prev => prev + 1);
    }, 4000);
  }, [isSpinning, gems, selectedBet]);

  const topBarItems = [
    { icon: Home, action: () => navigate("/") },
    { icon: Volume2, action: undefined },
    { icon: CircleHelp, action: undefined },
    { icon: History, action: undefined },
    { icon: BarChart3, action: undefined },
    { icon: Trophy, action: undefined },
  ];

  return (
    <div className="min-h-screen flex flex-col overflow-y-auto" style={{ background: "linear-gradient(180deg, hsl(45 90% 70%) 0%, hsl(35 95% 55%) 100%)" }}>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 py-2" style={{ background: "hsla(45, 80%, 60%, 0.5)" }}>
        <div className="flex items-center gap-1">
          {topBarItems.map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              className="h-9 w-9 rounded-lg border-2 flex items-center justify-center"
              style={{ borderColor: "hsla(45, 80%, 45%, 0.5)", background: "hsla(45, 80%, 70%, 0.3)" }}
            >
              <item.icon className="h-4 w-4" style={{ color: "hsl(45, 30%, 25%)" }} />
            </button>
          ))}
        </div>
        <div className="rounded-lg px-3 py-1.5 text-right" style={{ background: "hsla(0, 0%, 100%, 0.85)" }}>
          <p className="text-[10px] leading-tight" style={{ color: "hsl(0, 0%, 50%)" }}>Today's</p>
          <p className="font-bold text-sm leading-tight" style={{ color: "hsl(0, 0%, 20%)" }}>{todayRound} Round</p>
        </div>
      </div>

      {/* Wheel Section */}
      <div className="flex flex-col items-center px-4 pt-2 pb-4">
        <div className="relative w-[280px] h-[280px] my-2">
          {/* Spokes (static) */}
          <svg className="absolute inset-0 w-full h-full z-0" viewBox="0 0 280 280">
            {FOOD_ITEMS.map((_, i) => {
              const angle = (i * 45 - 90) * (Math.PI / 180);
              const cx = 140, cy = 140, r = 100;
              return (
                <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(angle)} y2={cy + r * Math.sin(angle)} stroke="hsl(200 70% 60%)" strokeWidth="3" />
              );
            })}
          </svg>

          {/* Rotating food items */}
          <div
            className="absolute inset-0 z-10"
            style={{
              transform: `rotate(${wheelAngle}deg)`,
              transition: isSpinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
            }}
          >
            {FOOD_ITEMS.map((food, i) => {
              const angle = (i * 45 - 90) * (Math.PI / 180);
              const r = 105;
              const x = 140 + r * Math.cos(angle);
              const y = 140 + r * Math.sin(angle);
              return (
                <div
                  key={i}
                  className="absolute flex flex-col items-center"
                  style={{
                    left: x,
                    top: y,
                    transform: `translate(-50%, -50%) rotate(-${wheelAngle}deg)`,
                    transition: isSpinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
                  }}
                >
                  <div className="w-14 h-14 rounded-full border-[3px] border-blue-600 bg-white flex items-center justify-center shadow-md">
                    <span className="text-xl">{food.emoji}</span>
                  </div>
                  <span className="text-[8px] font-bold mt-0.5 px-1 rounded-full whitespace-nowrap" style={{ background: "hsla(210, 80%, 90%, 0.9)", color: "hsl(210, 60%, 30%)" }}>
                    Win {food.multiplier}x
                  </span>
                  {i === 0 && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-white text-[7px] font-bold px-1.5 rounded-full" style={{ background: "hsl(0, 70%, 50%)" }}>
                      Hot
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Center circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center"
            style={{ borderColor: "hsl(0, 70%, 45%)", background: "radial-gradient(circle, hsl(0 65% 55%), hsl(0 75% 40%))" }}
          >
            <span className="text-xl">🍴</span>
            <p className="text-[9px] text-white font-bold leading-tight">Select time</p>
            <p className="text-lg font-bold text-white leading-tight">3</p>
            {/* Decorative dots */}
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  background: "hsl(50, 90%, 65%)",
                  top: `${50 - 47 * Math.cos((i * (360 / 14) * Math.PI) / 180)}%`,
                  left: `${50 + 47 * Math.sin((i * (360 / 14) * Math.PI) / 180)}%`,
                  transform: "translate(-50%, -50%)",
                }}
              />
            ))}
          </div>

          {/* Top pointer indicator */}
          <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 z-30 w-0 h-0"
            style={{ borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "14px solid hsl(0, 70%, 50%)" }}
          />
        </div>

        {/* Spin Button - Big and obvious */}
        <motion.button
          onClick={spin}
          disabled={isSpinning}
          whileTap={{ scale: 0.92 }}
          className="mt-2 w-48 py-3 rounded-2xl font-bold text-lg shadow-lg disabled:opacity-60"
          style={{
            background: isSpinning ? "hsl(0, 0%, 60%)" : "linear-gradient(180deg, hsl(0, 70%, 55%), hsl(0, 75%, 40%))",
            color: "white",
            border: "3px solid hsla(0, 0%, 100%, 0.3)",
          }}
        >
          {isSpinning ? "Spinning..." : "🎰 SPIN!"}
        </motion.button>

        {/* Category buttons */}
        <div className="flex items-center justify-between w-full mt-3 px-2">
          <button className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: "hsla(0, 0%, 100%, 0.8)", color: "hsl(30, 30%, 25%)" }}>
            🥗 Salad <ChevronRight className="h-3 w-3" />
          </button>
          <button className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: "hsla(0, 0%, 100%, 0.8)", color: "hsl(30, 30%, 25%)" }}>
            🍕 Pizza <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {/* Bet Options */}
        <div className="w-full mt-3 rounded-2xl p-3 flex gap-2 justify-center"
          style={{ background: "linear-gradient(180deg, hsl(200, 65%, 55%), hsl(210, 65%, 45%))" }}
        >
          {BET_OPTIONS.map((bet) => {
            const isActive = selectedBet === bet;
            return (
              <button
                key={bet}
                onClick={() => !isSpinning && setSelectedBet(bet)}
                className={`flex-1 rounded-xl p-2 flex flex-col items-center border-2 transition-all ${isSpinning ? "opacity-60" : ""}`}
                style={{
                  borderColor: isActive ? "hsl(50, 90%, 55%)" : "hsla(200, 50%, 70%, 0.4)",
                  background: isActive ? "hsl(0, 65%, 50%)" : "hsla(200, 50%, 60%, 0.4)",
                  transform: isActive ? "scale(1.05)" : "scale(1)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: isActive ? "hsl(50, 90%, 55%)" : "hsla(50, 70%, 60%, 0.6)",
                    color: isActive ? "hsl(0, 60%, 30%)" : "hsl(210, 40%, 20%)",
                  }}
                >
                  {bet >= 1000 ? `${bet / 1000}K` : bet}
                </div>
              </button>
            );
          })}
        </div>

        {/* Gems & Profits */}
        <div className="w-full flex gap-2 mt-3">
          <div className="flex-1 rounded-full px-3 py-2.5 flex items-center justify-center gap-1.5" style={{ background: "hsla(0, 0%, 100%, 0.9)" }}>
            <span className="text-[10px] font-semibold" style={{ color: "hsl(0, 0%, 45%)" }}>Gems</span>
            <Diamond className="h-3 w-3 text-primary" />
            <span className="font-bold text-sm" style={{ color: "hsl(0, 0%, 15%)" }}>{gems.toLocaleString()}</span>
          </div>
          <div className="flex-1 rounded-full px-3 py-2.5 flex items-center justify-center gap-1.5" style={{ background: "hsla(0, 0%, 100%, 0.9)" }}>
            <span className="text-[10px] font-semibold" style={{ color: "hsl(0, 0%, 45%)" }}>Profit</span>
            <Diamond className="h-3 w-3 text-primary" />
            <span className="font-bold text-sm" style={{ color: todayProfits >= 0 ? "hsl(140, 60%, 35%)" : "hsl(0, 65%, 50%)" }}>
              {todayProfits >= 0 ? "+" : ""}{todayProfits}
            </span>
          </div>
        </div>

        {/* Results */}
        <div className="w-full mt-3 rounded-2xl p-3" style={{ background: "hsla(0, 65%, 50%, 0.9)" }}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">Result</span>
            {results.length > 0 && <span className="text-white text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: "hsl(140, 60%, 45%)" }}>New</span>}
          </div>
          <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-hide">
            {results.length > 0 ? results.map((emoji, i) => (
              <div
                key={`${i}-${emoji}`}
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0"
                style={{ border: "1px solid hsla(0, 50%, 70%, 0.5)" }}
              >
                <span className="text-sm">{emoji}</span>
              </div>
            )) : (
              <p className="text-xs" style={{ color: "hsla(0, 0%, 100%, 0.6)" }}>Tap SPIN to play...</p>
            )}
          </div>
        </div>

        {/* Today's Ranking */}
        <div className="w-full mt-3 mb-6 rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: "hsla(0, 0%, 100%, 0.9)" }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(210, 70%, 92%)" }}>
            <Trophy className="h-5 w-5" style={{ color: "hsl(210, 60%, 50%)" }} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm" style={{ color: "hsl(0, 0%, 15%)" }}>Today's Betting Ranking</p>
            <div className="flex items-center gap-1">
              <Diamond className="h-3 w-3 text-primary" />
              <span className="text-xs font-semibold" style={{ color: "hsl(0, 0%, 50%)" }}>6,471,680</span>
            </div>
          </div>
          <ChevronRight className="h-5 w-5" style={{ color: "hsl(0, 0%, 70%)" }} />
        </div>
      </div>

      {/* Win/Loss Popup */}
      <AnimatePresence>
        {showWin && !isSpinning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "hsla(0, 0%, 0%, 0.5)" }}
            onClick={() => setShowWin(null)}
          >
            <motion.div
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="rounded-3xl p-8 mx-6 text-center shadow-2xl"
              style={{ background: "white" }}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-7xl block">{showWin.emoji}</span>
              <h3 className="font-bold text-2xl mt-4" style={{ color: "hsl(0, 0%, 15%)" }}>{showWin.name}</h3>
              {showWin.amount > 0 ? (
                <>
                  <p className="text-lg font-bold mt-2" style={{ color: "hsl(140, 60%, 35%)" }}>
                    🎉 You won {showWin.amount} gems!
                  </p>
                </>
              ) : (
                <p className="text-sm mt-2" style={{ color: "hsl(0, 60%, 50%)" }}>
                  Better luck next time! 😅
                </p>
              )}
              <button
                onClick={() => setShowWin(null)}
                className="mt-5 font-bold px-10 py-3 rounded-full text-sm text-white"
                style={{ background: "linear-gradient(135deg, hsl(35, 95%, 55%), hsl(25, 90%, 50%))" }}
              >
                {showWin.amount > 0 ? "🎊 Collect" : "Try Again"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GreedyKingGame;
