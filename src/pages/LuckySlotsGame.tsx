import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Volume2, VolumeX, Minus, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { playBetSound, playSpinSound, playWinSound, playLoseSound, playResultReveal, startBgMusic, stopBgMusic } from "@/hooks/useGameSounds";
import { useBalanceContext } from "@/contexts/BalanceContext";

const SYMBOLS = ["🍒", "🍋", "🍊", "🔔", "💎", "7️⃣", "⭐", "🍀"];
const SYMBOL_NAMES: Record<string, string> = {
  "🍒": "CHERRY", "🍋": "LEMON", "🍊": "ORANGE", "🔔": "BELL",
  "💎": "DIAMOND", "7️⃣": "SEVEN", "⭐": "STAR", "🍀": "CLOVER",
};
const SYMBOL_PAYOUTS: Record<string, number> = {
  "🍒": 2, "🍋": 3, "🍊": 4, "🔔": 8, "💎": 15, "7️⃣": 25, "⭐": 50, "🍀": 5,
};

const BET_PRESETS = [1, 3, 5, 10, 50];
const REEL_SYMBOLS_COUNT = 24;

type GamePhase = "betting" | "spinning" | "result";

const generateReelStrip = (): string[] => {
  return Array.from({ length: REEL_SYMBOLS_COUNT }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
};

const LuckySlotsGame = () => {
  const navigate = useNavigate();
  const [soundOn, setSoundOn] = useState(true);
  const soundRef = useRef(true);
  useEffect(() => { soundRef.current = soundOn; }, [soundOn]);
  const { dollarBalance, starBalance } = useBalanceContext();
  const [localDollarAdj, setLocalDollarAdj] = useState(0);
  const [localStarAdj, setLocalStarAdj] = useState(0);
  const gameDollarBalance = dollarBalance + localDollarAdj;
  const gameStarBalance = starBalance + localStarAdj;
  const [activeWallet, setActiveWallet] = useState<"dollar" | "star">("dollar");
  const [selectedBet, setSelectedBet] = useState(1);
  const [phase, setPhase] = useState<GamePhase>("betting");
  // 3 reels, each with 3 visible rows (top, center, bottom)
  const [reelRows, setReelRows] = useState<string[][]>([
    ["7️⃣", "💎", "🍒"],
    ["🔔", "7️⃣", "🍋"],
    ["⭐", "🍊", "7️⃣"],
  ]);
  const [winAmount, setWinAmount] = useState(0);
  const [totalLost, setTotalLost] = useState(0);
  const [results, setResults] = useState<{ symbols: string[]; win: number }[]>([]);
  const [round, setRound] = useState(1);
  const [resultTimer, setResultTimer] = useState(3);
  const [spinningReels, setSpinningReels] = useState([false, false, false]);
  const [winLine, setWinLine] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spinRefs = useRef<ReturnType<typeof setInterval>[]>([]);

  useEffect(() => {
    if (soundOn) startBgMusic();
    else stopBgMusic();
    return () => { stopBgMusic(); };
  }, [soundOn]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      spinRefs.current.forEach(r => clearInterval(r));
    };
  }, []);

  const currentBalance = activeWallet === "dollar" ? gameDollarBalance : gameStarBalance;

  const spin = () => {
    if (phase !== "betting" || currentBalance < selectedBet) return;

    if (activeWallet === "dollar") setLocalDollarAdj(p => p - selectedBet);
    else setLocalStarAdj(p => p - selectedBet);

    if (soundRef.current) playBetSound();
    setPhase("spinning");
    setWinLine(false);
    if (soundRef.current) playSpinSound();
    setSpinningReels([true, true, true]);

    // Rigged result for center row (win line)
    const shouldWin = Math.random() < 0.2;
    let centerResult: string[];

    if (shouldWin) {
      const winSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      const fullMatch = Math.random() < 0.3;
      if (fullMatch) {
        centerResult = [winSymbol, winSymbol, winSymbol];
      } else {
        const otherSymbols = SYMBOLS.filter(s => s !== winSymbol);
        const other = otherSymbols[Math.floor(Math.random() * otherSymbols.length)];
        const pos = Math.floor(Math.random() * 3);
        centerResult = [winSymbol, winSymbol, winSymbol];
        centerResult[pos] = other;
      }
    } else {
      const shuffled = [...SYMBOLS].sort(() => Math.random() - 0.5);
      centerResult = [shuffled[0], shuffled[1], shuffled[2]];
      if (centerResult[0] === centerResult[1] && centerResult[1] === centerResult[2]) {
        centerResult[2] = SYMBOLS.find(s => s !== centerResult[0]) || "🍋";
      }
    }

    // Generate full 3-row results for each reel
    const fullResults: string[][] = [0, 1, 2].map(i => {
      const top = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      const center = centerResult[i];
      const bottom = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      return [top, center, bottom];
    });

    // Rapid reel animation
    spinRefs.current.forEach(r => clearInterval(r));
    spinRefs.current = [0, 1, 2].map(i => {
      return setInterval(() => {
        setReelRows(prev => {
          const copy = [...prev];
          copy[i] = [
            SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
            SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
            SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
          ];
          return copy;
        });
      }, 55 + i * 20);
    });

    // Stop reels one by one
    const stopReel = (index: number, delay: number) => {
      setTimeout(() => {
        if (spinRefs.current[index]) clearInterval(spinRefs.current[index]);
        setSpinningReels(prev => { const c = [...prev]; c[index] = false; return c; });
        setReelRows(prev => { const c = [...prev]; c[index] = fullResults[index]; return c; });
      }, delay);
    };

    stopReel(0, 1000);
    stopReel(1, 1800);
    stopReel(2, 2600);

    setTimeout(() => {
      spinRefs.current.forEach(r => clearInterval(r));
      if (soundRef.current) playResultReveal();

      const [s1, s2, s3] = centerResult;
      let prize = 0;
      if (s1 === s2 && s2 === s3) {
        prize = selectedBet * (SYMBOL_PAYOUTS[s1] || 2);
      } else if (s1 === s2 || s2 === s3 || s1 === s3) {
        const matchSymbol = s1 === s2 ? s1 : s1 === s3 ? s1 : s2;
        prize = Math.floor(selectedBet * ((SYMBOL_PAYOUTS[matchSymbol] || 2) * 0.3));
      }

      setResults(prev => [{ symbols: centerResult, win: prize }, ...prev].slice(0, 10));
      setRound(r => r + 1);

      if (prize > 0) {
        setWinAmount(prize);
        setTotalLost(0);
        setWinLine(true);
        if (activeWallet === "dollar") setLocalDollarAdj(p => p + prize);
        else setLocalStarAdj(p => p + prize);
        if (soundRef.current) playWinSound();
      } else {
        setWinAmount(0);
        setTotalLost(selectedBet);
        if (soundRef.current) playLoseSound();
      }

      setPhase("result");
      setResultTimer(3);
      timerRef.current = setInterval(() => {
        setResultTimer(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setPhase("betting");
            setWinLine(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, 3000);
  };

  const currSymbol = activeWallet === "dollar" ? "$" : "⭐";

  return (
    <div className="min-h-screen flex flex-col" style={{
      background: "linear-gradient(180deg, hsl(220 30% 12%) 0%, hsl(230 40% 8%) 100%)",
    }}>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 py-2" style={{
        background: "linear-gradient(180deg, hsl(0 70% 35%), hsl(0 60% 25%))",
        borderBottom: "2px solid hsl(45 90% 55%)",
      }}>
        <div className="flex items-center gap-1.5">
          <button onClick={() => navigate("/")} className="h-9 w-9 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(180deg, hsl(0 65% 45%), hsl(0 55% 30%))", border: "2px solid hsl(45 80% 55%)" }}>
            <Home className="h-4 w-4" style={{ color: "hsl(45 90% 80%)" }} />
          </button>
          <button onClick={() => setSoundOn(p => !p)} className="h-9 w-9 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(180deg, hsl(0 65% 45%), hsl(0 55% 30%))", border: "2px solid hsl(45 80% 55%)" }}>
            {soundOn ? <Volume2 className="h-4 w-4" style={{ color: "hsl(45 90% 80%)" }} /> : <VolumeX className="h-4 w-4" style={{ color: "hsl(0 0% 60%)" }} />}
          </button>
        </div>
        {/* Balance */}
        <div className="flex items-center gap-2">
          <div className="rounded-lg px-3 py-1.5 flex items-center gap-1.5" style={{
            background: "linear-gradient(180deg, hsl(220 40% 15%), hsl(220 30% 10%))",
            border: "1px solid hsl(45 80% 50%)",
          }}>
            <span className="text-xs" style={{ color: "hsl(45 80% 70%)" }}>{activeWallet === "dollar" ? "💲" : "⭐"}</span>
            <span className="font-bold text-sm" style={{ color: "hsl(45 90% 65%)" }}>
              {(activeWallet === "dollar" ? gameDollarBalance : gameStarBalance).toLocaleString()}
            </span>
          </div>
          <button onClick={() => phase === "betting" && setActiveWallet(prev => prev === "dollar" ? "star" : "dollar")}
            className="h-8 w-8 rounded-full flex items-center justify-center text-xs"
            style={{ background: "hsl(45 80% 50%)", color: "hsl(0 0% 10%)", opacity: phase !== "betting" ? 0.4 : 1 }}>🔄</button>
        </div>
      </div>

      {/* Title Banner */}
      <div className="text-center py-3 relative" style={{
        background: "linear-gradient(180deg, hsl(220 60% 45%), hsl(220 70% 35%))",
        borderBottom: "3px solid hsl(45 90% 55%)",
      }}>
        <div className="absolute inset-0 opacity-20" style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 3px, hsla(0 0% 100% / 0.1) 3px, hsla(0 0% 100% / 0.1) 4px)",
        }} />
        <h1 className="text-3xl font-black tracking-wider relative" style={{
          color: "hsl(45 100% 60%)",
          textShadow: "0 2px 4px hsla(0 0% 0% / 0.5), 0 0 20px hsla(45 100% 50% / 0.4)",
          letterSpacing: "0.1em",
        }}>
          LUCKY SLOTS
        </h1>
        <p className="text-[10px] font-bold tracking-widest relative" style={{ color: "hsl(45 80% 80%)" }}>★ TRIPLE PAY ★</p>
      </div>

      {/* Paytable */}
      <div className="mx-3 mt-3 rounded-xl overflow-hidden" style={{
        background: "linear-gradient(180deg, hsl(220 50% 20%), hsl(220 40% 12%))",
        border: "2px solid hsl(45 80% 45%)",
      }}>
        <div className="px-3 py-1.5 text-center" style={{ background: "hsl(0 65% 35%)", borderBottom: "1px solid hsl(45 80% 45%)" }}>
          <span className="text-[10px] font-bold tracking-widest" style={{ color: "hsl(45 90% 70%)" }}>PAYTABLE</span>
        </div>
        <div className="grid grid-cols-4 gap-x-1 gap-y-0.5 p-2">
          {SYMBOLS.map(s => (
            <div key={s} className="flex items-center justify-between px-1.5 py-1 rounded" style={{ background: "hsla(220 40% 30% / 0.5)" }}>
              <span className="text-sm">{s}{s}{s}</span>
              <span className="text-[9px] font-black" style={{ color: "hsl(45 90% 60%)" }}>{SYMBOL_PAYOUTS[s]}X</span>
            </div>
          ))}
        </div>
      </div>

      {/* === SLOT MACHINE FRAME === */}
      <div className="mx-3 mt-3 rounded-2xl overflow-hidden" style={{
        background: "linear-gradient(180deg, hsl(0 70% 40%), hsl(0 60% 28%))",
        border: "3px solid hsl(45 90% 55%)",
        boxShadow: "0 0 30px hsla(0 70% 40% / 0.4), inset 0 1px 0 hsla(0 0% 100% / 0.2)",
      }}>
        {/* Machine top arch */}
        <div className="h-3" style={{
          background: "linear-gradient(180deg, hsl(45 90% 60%), hsl(35 80% 45%))",
        }} />

        {/* Reels Container */}
        <div className="mx-2 mt-2 mb-2 rounded-xl overflow-hidden" style={{
          background: "linear-gradient(180deg, hsl(220 30% 12%), hsl(220 25% 8%))",
          border: "3px solid hsl(45 80% 50%)",
          boxShadow: "inset 0 4px 16px hsla(0 0% 0% / 0.5)",
        }}>
          {/* Win line indicator */}
          <div className="relative">
            {/* The 3 reels with 3 rows */}
            <div className="flex">
              {[0, 1, 2].map(reelIdx => (
                <div key={reelIdx} className="flex-1 flex flex-col" style={{
                  borderRight: reelIdx < 2 ? "2px solid hsla(45 80% 50% / 0.3)" : "none",
                }}>
                  {[0, 1, 2].map(rowIdx => {
                    const isCenter = rowIdx === 1;
                    const symbol = reelRows[reelIdx][rowIdx];
                    const isSpinning = spinningReels[reelIdx];
                    return (
                      <motion.div
                        key={rowIdx}
                        className="flex items-center justify-center relative"
                        style={{
                          height: 72,
                          background: isCenter
                            ? "linear-gradient(180deg, hsla(0 0% 100% / 0.12), hsla(0 0% 100% / 0.06))"
                            : "hsla(0 0% 0% / 0.2)",
                          borderTop: rowIdx > 0 ? "1px solid hsla(0 0% 100% / 0.08)" : "none",
                        }}
                        animate={isSpinning ? { y: [0, -8, 0, 8, 0] } : { y: 0 }}
                        transition={isSpinning ? { duration: 0.1, repeat: Infinity } : { type: "spring", stiffness: 300 }}
                      >
                        <span className="text-4xl select-none" style={{
                          filter: isCenter ? "none" : "brightness(0.6)",
                          transform: isCenter ? "scale(1.15)" : "scale(0.9)",
                          textShadow: isCenter ? "0 2px 8px hsla(0 0% 0% / 0.3)" : "none",
                        }}>
                          {symbol}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Win line overlay - center row */}
            <div className="absolute left-0 right-0 pointer-events-none" style={{
              top: 72,
              height: 72,
            }}>
              {/* Left arrow */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-6 rounded-r-full z-10" style={{
                background: winLine ? "hsl(45 100% 55%)" : "hsl(0 70% 50%)",
                boxShadow: winLine ? "0 0 10px hsl(45 100% 55%)" : "none",
              }} />
              {/* Right arrow */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-6 rounded-l-full z-10" style={{
                background: winLine ? "hsl(45 100% 55%)" : "hsl(0 70% 50%)",
                boxShadow: winLine ? "0 0 10px hsl(45 100% 55%)" : "none",
              }} />
              {/* Line */}
              <div className="absolute left-3 right-3 top-1/2 h-[2px] -translate-y-1/2" style={{
                background: winLine
                  ? "linear-gradient(90deg, hsl(45 100% 55%), hsl(50 100% 65%), hsl(45 100% 55%))"
                  : "linear-gradient(90deg, transparent, hsla(0 70% 50% / 0.5), transparent)",
                boxShadow: winLine ? "0 0 8px hsl(45 100% 55%)" : "none",
              }} />
            </div>
          </div>
        </div>

        {/* Reel separators (chrome pillars) */}
        <div className="flex justify-around px-6 -mt-[230px] pointer-events-none relative z-20" style={{ height: 0 }}>
          {/* Decorative only - visual depth */}
        </div>

        {/* Machine bottom chrome */}
        <div className="h-2 mx-2 rounded-b-lg" style={{
          background: "linear-gradient(180deg, hsl(45 70% 60%), hsl(35 60% 40%))",
        }} />

        {/* Decorative stars row */}
        <div className="flex justify-center gap-1 py-1.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.span
              key={i}
              animate={winLine ? { opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] } : { opacity: 0.4 }}
              transition={{ duration: 0.5, repeat: winLine ? Infinity : 0, delay: i * 0.05 }}
              className="text-[8px]"
              style={{ color: i % 2 === 0 ? "hsl(45 90% 55%)" : "hsl(0 70% 55%)" }}
            >★</motion.span>
          ))}
        </div>
      </div>

      {/* Result */}
      <AnimatePresence>
        {phase === "result" && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center my-2">
            {winAmount > 0 ? (
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <p className="text-2xl font-black" style={{
                  color: "hsl(45 100% 60%)",
                  textShadow: "0 0 20px hsla(45 100% 50% / 0.6), 0 2px 4px hsla(0 0% 0% / 0.5)",
                }}>
                  {reelRows[0][1] === reelRows[1][1] && reelRows[1][1] === reelRows[2][1] ? "🎰 JACKPOT! 🎰" : "🎉 WIN!"}
                </p>
                <p className="text-xl font-bold mt-1" style={{ color: "hsl(45 90% 70%)" }}>
                  {activeWallet === "dollar" ? "$" : ""}{winAmount}{activeWallet === "star" ? " ⭐" : ""}
                </p>
              </motion.div>
            ) : (
              <p className="text-lg font-bold" style={{ color: "hsl(0 60% 60%)" }}>No Match — Lost {activeWallet === "dollar" ? "$" : ""}{totalLost}{activeWallet === "star" ? " ⭐" : ""}</p>
            )}
            <p className="text-[10px] mt-1" style={{ color: "hsl(0 0% 50%)" }}>Next spin in {resultTimer}s</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Controls */}
      <div className="mt-auto">
        {/* Bet Controls */}
        <div className="mx-3 rounded-xl overflow-hidden" style={{
          background: "linear-gradient(180deg, hsl(220 30% 18%), hsl(220 25% 10%))",
          border: "2px solid hsl(45 70% 45%)",
        }}>
          {/* +/- bar */}
          <div className="flex items-center">
            <button
              onClick={() => { if (phase !== "betting") return; setSelectedBet(prev => Math.max(1, prev - 1)); }}
              disabled={phase !== "betting"}
              className="flex-none w-16 h-12 flex items-center justify-center"
              style={{ background: "linear-gradient(180deg, hsl(220 40% 30%), hsl(220 35% 20%))", borderRight: "1px solid hsl(45 70% 40%)" }}>
              <Minus className="h-5 w-5" style={{ color: "hsl(0 0% 80%)" }} />
            </button>
            <div className="flex-1 h-12 flex items-center justify-center" style={{ background: "linear-gradient(180deg, hsl(220 30% 15%), hsl(220 25% 10%))" }}>
              <span className="text-xl font-black tracking-wide" style={{ color: "hsl(50 100% 60%)" }}>
                {activeWallet === "dollar" ? `$${selectedBet.toFixed(2)}` : `${selectedBet.toFixed(2)} ⭐`}
              </span>
            </div>
            <button
              onClick={() => { if (phase !== "betting") return; setSelectedBet(prev => prev + 1); }}
              disabled={phase !== "betting"}
              className="flex-none w-16 h-12 flex items-center justify-center"
              style={{ background: "linear-gradient(180deg, hsl(220 40% 30%), hsl(220 35% 20%))", borderLeft: "1px solid hsl(45 70% 40%)" }}>
              <Plus className="h-5 w-5" style={{ color: "hsl(0 0% 80%)" }} />
            </button>
          </div>
          {/* Preset buttons */}
          <div className="grid grid-cols-5 gap-1 p-1.5" style={{ borderTop: "1px solid hsl(45 70% 40%)" }}>
            {BET_PRESETS.map((bet) => (
              <button key={bet} onClick={() => phase === "betting" && setSelectedBet(prev => prev + bet)}
                className="rounded-lg py-2 text-sm font-bold transition-all"
                style={{
                  background: "linear-gradient(180deg, hsl(220 35% 28%), hsl(220 30% 18%))",
                  color: "hsl(0 0% 85%)",
                  border: "1px solid hsla(45 60% 40% / 0.5)",
                }}>
                {activeWallet === "dollar" ? `$${bet}` : `${bet}⭐`}
              </button>
            ))}
          </div>
        </div>

        {/* SPIN Button */}
        <div className="mx-3 mt-2 mb-3">
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={spin}
            disabled={phase !== "betting" || currentBalance < selectedBet}
            className="w-full py-4 rounded-xl text-xl font-black tracking-widest transition-all relative overflow-hidden"
            style={{
              background: phase === "betting" && currentBalance >= selectedBet
                ? "linear-gradient(180deg, hsl(0 75% 50%), hsl(0 65% 38%))"
                : "hsla(0, 0%, 30%, 0.5)",
              color: phase === "betting" && currentBalance >= selectedBet ? "hsl(45 100% 65%)" : "hsl(0 0% 50%)",
              border: phase === "betting" && currentBalance >= selectedBet ? "3px solid hsl(45 90% 55%)" : "3px solid hsla(0 0% 40% / 0.3)",
              textShadow: phase === "betting" ? "0 2px 4px hsla(0 0% 0% / 0.5)" : "none",
              boxShadow: phase === "betting" && currentBalance >= selectedBet ? "0 4px 20px hsla(0 70% 40% / 0.5)" : "none",
            }}
          >
            {phase === "betting"
              ? "🎰 SPIN"
              : phase === "spinning" ? "SPINNING..." : `NEXT IN ${resultTimer}s`}
          </motion.button>
        </div>

        {/* Results History */}
        <div className="mx-3 mb-4 rounded-xl p-2.5" style={{
          background: "linear-gradient(180deg, hsl(220 30% 15%), hsl(220 25% 10%))",
          border: "1px solid hsla(45 60% 40% / 0.3)",
        }}>
          <span className="text-[10px] font-bold tracking-wide" style={{ color: "hsl(45 80% 60%)" }}>HISTORY</span>
          <div className="flex gap-1.5 mt-1.5 overflow-x-auto scrollbar-hide">
            {results.length > 0 ? results.map((r, i) => (
              <div key={i} className="flex items-center gap-0.5 px-2 h-7 rounded-full flex-shrink-0"
                style={{
                  background: r.win > 0 ? "hsla(45 80% 50% / 0.15)" : "hsla(0 0% 100% / 0.05)",
                  border: r.win > 0 ? "1px solid hsl(45 80% 50%)" : "1px solid hsla(0 0% 100% / 0.1)",
                }}>
                {r.symbols.map((s, j) => <span key={j} className="text-[11px]">{s}</span>)}
              </div>
            )) : (
              <p className="text-[10px]" style={{ color: "hsla(0, 0%, 100%, 0.4)" }}>Spin to see results...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LuckySlotsGame;
