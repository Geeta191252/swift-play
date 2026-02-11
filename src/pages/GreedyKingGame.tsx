import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, CircleHelp, Diamond, ChevronRight, History, Home, Trophy, Volume2, X } from "lucide-react";
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

const FAKE_WINNERS = [
  { name: "Meer", gems: 100, rank: 1 },
  { name: "Ronnie Hass...", gems: 100, rank: 2 },
  { name: "Reserved for You", gems: 0, rank: 3 },
];

type GamePhase = "betting" | "countdown" | "spinning" | "result";

const GreedyKingGame = () => {
  const navigate = useNavigate();
  const [gems, setGems] = useState(7575);
  const [todayProfits, setTodayProfits] = useState(0);
  const [selectedBet, setSelectedBet] = useState(10);
  const [hasBet, setHasBet] = useState(false);
  const [phase, setPhase] = useState<GamePhase>("betting");
  const [countdown, setCountdown] = useState(15);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [results, setResults] = useState<string[]>([]);
  const [todayRound, setTodayRound] = useState(381);
  const [currentWinner, setCurrentWinner] = useState<typeof FOOD_ITEMS[0] | null>(null);
  const [winAmount, setWinAmount] = useState(0);
  const [resultTimer, setResultTimer] = useState(4);
  const totalRotationRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Main game loop
  useEffect(() => {
    startBettingPhase();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startBettingPhase = useCallback(() => {
    setPhase("betting");
    setHasBet(false);
    setCurrentWinner(null);
    setCountdown(15);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          startCountdownPhase();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const startCountdownPhase = useCallback(() => {
    setPhase("countdown");
    setCountdown(3);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          startSpinning();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const startSpinning = useCallback(() => {
    setPhase("spinning");

    const winnerIdx = Math.floor(Math.random() * FOOD_ITEMS.length);
    const extraSpins = 4 + Math.floor(Math.random() * 3);
    const targetAngle = totalRotationRef.current + (extraSpins * 360) + (360 - (winnerIdx * 45));
    totalRotationRef.current = targetAngle;
    setWheelAngle(targetAngle);

    setTimeout(() => {
      const won = FOOD_ITEMS[winnerIdx];
      setCurrentWinner(won);
      setResults(prev => [won.emoji, ...prev].slice(0, 12));
      setTodayRound(prev => prev + 1);

      // Calculate win if user placed a bet
      setHasBet(prev => {
        if (prev) {
          const isWin = Math.random() > 0.35;
          const amount = isWin ? Math.round(selectedBet * (won.multiplier / 10)) : 0;
          setWinAmount(amount);
          if (amount > 0) {
            setGems(g => g + amount);
            setTodayProfits(p => p + (amount - selectedBet));
          } else {
            setTodayProfits(p => p - selectedBet);
          }
        } else {
          setWinAmount(0);
        }
        return prev;
      });

      showResult();
    }, 4000);
  }, [selectedBet]);

  const showResult = useCallback(() => {
    setPhase("result");
    setResultTimer(4);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setResultTimer(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          startBettingPhase();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [startBettingPhase]);

  const placeBet = () => {
    if (phase !== "betting" || hasBet) return;
    if (gems < selectedBet) return;
    setGems(prev => prev - selectedBet);
    setHasBet(true);
  };

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
          {/* Spokes */}
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
              transition: phase === "spinning" ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
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
                    transition: phase === "spinning" ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
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

          {/* Center circle - changes based on phase */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center"
            style={{
              borderColor: (phase === "countdown" || phase === "spinning") ? "hsl(0, 0%, 15%)" : "hsl(0, 70%, 45%)",
              background: (phase === "countdown" || phase === "spinning")
                ? "hsl(0, 0%, 10%)"
                : "radial-gradient(circle, hsl(0 65% 55%), hsl(0 75% 40%))",
            }}
          >
            {phase === "betting" && (
              <>
                <span className="text-xl">🍴</span>
                <p className="text-[9px] text-white font-bold leading-tight">Bet now</p>
                <p className="text-2xl font-bold text-white leading-tight">{countdown}</p>
              </>
            )}
            {phase === "countdown" && (
              <>
                <p className="text-4xl font-bold text-white">{countdown}</p>
                <p className="text-[8px] text-white/80 font-bold leading-tight text-center">The result coming</p>
              </>
            )}
            {phase === "spinning" && (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <p className="text-[8px] text-white/80 font-bold mt-1">Spinning...</p>
              </>
            )}
            {phase === "result" && currentWinner && (
              <>
                <span className="text-2xl">{currentWinner.emoji}</span>
                <p className="text-[8px] text-white font-bold">{currentWinner.name}</p>
              </>
            )}
          </div>

          {/* Top pointer */}
          <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 z-30 w-0 h-0"
            style={{ borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "14px solid hsl(0, 70%, 50%)" }}
          />
        </div>

        {/* Place Bet Button */}
        <motion.button
          onClick={placeBet}
          disabled={phase !== "betting" || hasBet || gems < selectedBet}
          whileTap={{ scale: 0.92 }}
          className="mt-2 w-48 py-3 rounded-2xl font-bold text-lg shadow-lg disabled:opacity-50 text-white"
          style={{
            background: hasBet
              ? "hsl(140, 50%, 40%)"
              : phase !== "betting"
              ? "hsl(0, 0%, 50%)"
              : "linear-gradient(180deg, hsl(0, 70%, 55%), hsl(0, 75%, 40%))",
            border: "3px solid hsla(0, 0%, 100%, 0.3)",
          }}
        >
          {hasBet ? "✅ Bet Placed!" : phase === "betting" ? `🎰 Place Bet (${countdown}s)` : phase === "spinning" ? "⏳ Spinning..." : "⏳ Wait..."}
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
                onClick={() => phase === "betting" && !hasBet && setSelectedBet(bet)}
                className={`flex-1 rounded-xl p-2 flex flex-col items-center border-2 transition-all ${(phase !== "betting" || hasBet) ? "opacity-50" : ""}`}
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

        {/* Results History */}
        <div className="w-full mt-3 rounded-2xl p-3" style={{ background: "hsla(0, 65%, 50%, 0.9)" }}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">Result</span>
            {results.length > 0 && <span className="text-white text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: "hsl(140, 60%, 45%)" }}>New</span>}
          </div>
          <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-hide">
            {results.length > 0 ? results.map((emoji, i) => (
              <div key={`${i}-${emoji}`} className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0" style={{ border: "1px solid hsla(0, 50%, 70%, 0.5)" }}>
                <span className="text-sm">{emoji}</span>
              </div>
            )) : (
              <p className="text-xs" style={{ color: "hsla(0, 0%, 100%, 0.6)" }}>Waiting for first round...</p>
            )}
          </div>
        </div>

        {/* Ranking */}
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

      {/* Result Panel - slides up from bottom */}
      <AnimatePresence>
        {phase === "result" && currentWinner && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl shadow-2xl overflow-hidden"
            style={{ background: "white" }}
          >
            {/* Confetti decoration */}
            <div className="relative px-5 pt-5 pb-6">
              {/* Close timer */}
              <div className="absolute top-3 right-4 flex items-center gap-1">
                <X className="h-4 w-4" style={{ color: "hsl(0, 0%, 60%)" }} />
                <span className="text-sm font-bold" style={{ color: "hsl(0, 0%, 50%)" }}>{resultTimer}s</span>
              </div>

              {/* Decorative food icons */}
              <div className="flex items-center justify-center gap-1 mb-3">
                <span className="text-lg opacity-40">🍴</span>
                <span className="text-lg opacity-40">🥄</span>
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="text-5xl"
                >
                  {currentWinner.emoji}
                </motion.span>
                <span className="text-lg opacity-40">🔪</span>
                <span className="text-lg opacity-40">🍽️</span>
              </div>

              {/* Round result */}
              <p className="text-center text-sm font-semibold" style={{ color: "hsl(0, 0%, 30%)" }}>
                The {todayRound} round's result: {currentWinner.emoji}
              </p>

              {hasBet ? (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center font-bold text-lg mt-1"
                  style={{ color: winAmount > 0 ? "hsl(140, 60%, 35%)" : "hsl(0, 60%, 45%)" }}
                >
                  {winAmount > 0 ? `🎉 You won ${winAmount} gems!` : "😅 Better luck next round!"}
                </motion.p>
              ) : (
                <p className="text-center font-bold text-sm mt-1" style={{ color: "hsl(0, 0%, 30%)" }}>
                  You didn't play this round.
                </p>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3 mt-4 mb-3">
                <div className="flex-1 h-px" style={{ background: "hsl(0, 0%, 85%)" }} />
                <span className="text-xs" style={{ color: "hsl(0, 0%, 55%)" }}>This round's biggest winner</span>
                <div className="flex-1 h-px" style={{ background: "hsl(0, 0%, 85%)" }} />
              </div>

              {/* Winners */}
              <div className="flex items-start justify-center gap-6">
                {FAKE_WINNERS.map((winner, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.15 }}
                    className="flex flex-col items-center"
                  >
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: i < 2 ? "hsl(210, 20%, 85%)" : "hsl(0, 0%, 90%)" }}>
                        {i === 0 && <span className="text-2xl">👤</span>}
                        {i === 1 && <span className="text-2xl">👤</span>}
                        {i === 2 && <span className="text-xl">🎁</span>}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: i === 0 ? "hsl(50, 90%, 50%)" : i === 1 ? "hsl(210, 60%, 55%)" : "hsl(0, 0%, 70%)" }}
                      >
                        {winner.rank}
                      </div>
                    </div>
                    <p className="text-xs font-semibold mt-1.5 text-center max-w-[70px] truncate" style={{ color: "hsl(0, 0%, 25%)" }}>
                      {winner.name}
                    </p>
                    {winner.gems > 0 && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <Diamond className="h-2.5 w-2.5 text-primary" />
                        <span className="text-[10px] font-bold" style={{ color: "hsl(35, 90%, 45%)" }}>{winner.gems}</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GreedyKingGame;
