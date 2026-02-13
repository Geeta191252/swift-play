import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Volume2, VolumeX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { playBetSound, playSpinSound, playWinSound, playLoseSound, playResultReveal, startBgMusic, stopBgMusic } from "@/hooks/useGameSounds";
import { useBalanceContext } from "@/contexts/BalanceContext";

const SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "🔔", "💎", "7️⃣", "⭐"];
const SYMBOL_PAYOUTS: Record<string, number> = {
  "🍒": 2,
  "🍋": 3,
  "🍊": 4,
  "🍇": 5,
  "🔔": 8,
  "💎": 15,
  "7️⃣": 25,
  "⭐": 50,
};

const BET_PRESETS = [1, 3, 5, 10, 50];
const REEL_SIZE = 20; // number of symbols visible in spinning animation

type GamePhase = "betting" | "spinning" | "result";

const generateReel = (): string[] => {
  return Array.from({ length: REEL_SIZE }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
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
  const [reels, setReels] = useState<string[][]>([["🍒", "🍋", "🍊"], ["🍒", "🍋", "🍊"], ["🍒", "🍋", "🍊"]]);
  const [finalSymbols, setFinalSymbols] = useState(["🍒", "🍋", "🍊"]);
  const [winAmount, setWinAmount] = useState(0);
  const [totalLost, setTotalLost] = useState(0);
  const [results, setResults] = useState<{ symbols: string[]; win: number }[]>([]);
  const [round, setRound] = useState(1);
  const [resultTimer, setResultTimer] = useState(3);
  const [spinningReels, setSpinningReels] = useState([false, false, false]);
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
    if (soundRef.current) playSpinSound();
    setSpinningReels([true, true, true]);

    // Rigged result
    const shouldWin = Math.random() < 0.2;
    let result: string[];

    if (shouldWin) {
      // Pick a random symbol for a match
      const winSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      const fullMatch = Math.random() < 0.3;
      if (fullMatch) {
        result = [winSymbol, winSymbol, winSymbol];
      } else {
        // 2 match
        const otherSymbols = SYMBOLS.filter(s => s !== winSymbol);
        const other = otherSymbols[Math.floor(Math.random() * otherSymbols.length)];
        const pos = Math.floor(Math.random() * 3);
        result = [winSymbol, winSymbol, winSymbol];
        result[pos] = other;
      }
    } else {
      // All different
      const shuffled = [...SYMBOLS].sort(() => Math.random() - 0.5);
      result = [shuffled[0], shuffled[1], shuffled[2]];
      // Ensure not all same
      if (result[0] === result[1] && result[1] === result[2]) {
        result[2] = SYMBOLS.find(s => s !== result[0]) || "🍋";
      }
    }

    // Animate reels stopping one by one
    const stopReel = (index: number, symbol: string, delay: number) => {
      setTimeout(() => {
        setSpinningReels(prev => {
          const copy = [...prev];
          copy[index] = false;
          return copy;
        });
        setFinalSymbols(prev => {
          const copy = [...prev];
          copy[index] = symbol;
          return copy;
        });
      }, delay);
    };

    // Rapid reel animation
    spinRefs.current.forEach(r => clearInterval(r));
    spinRefs.current = [0, 1, 2].map(i => {
      return setInterval(() => {
        setReels(prev => {
          const copy = [...prev];
          copy[i] = generateReel().slice(0, 3);
          return copy;
        });
      }, 60 + i * 15);
    });

    stopReel(0, result[0], 1200);
    stopReel(1, result[1], 2000);
    stopReel(2, result[2], 2800);

    setTimeout(() => {
      spinRefs.current.forEach(r => clearInterval(r));
      if (soundRef.current) playResultReveal();

      // Calculate winnings
      const [s1, s2, s3] = result;
      let prize = 0;
      if (s1 === s2 && s2 === s3) {
        prize = selectedBet * (SYMBOL_PAYOUTS[s1] || 2);
      } else if (s1 === s2 || s2 === s3 || s1 === s3) {
        const matchSymbol = s1 === s2 ? s1 : s1 === s3 ? s1 : s2;
        prize = Math.floor(selectedBet * ((SYMBOL_PAYOUTS[matchSymbol] || 2) * 0.3));
      }

      setResults(prev => [{ symbols: result, win: prize }, ...prev].slice(0, 10));
      setRound(r => r + 1);

      if (prize > 0) {
        setWinAmount(prize);
        setTotalLost(0);
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
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, 3200);
  };

  const renderSlotSymbol = (symbol: string, isSpinning: boolean, reelIndex: number) => {
    if (isSpinning) {
      return (
        <motion.div
          key={`spinning-${reelIndex}`}
          className="flex flex-col items-center"
          animate={{ y: [0, -60] }}
          transition={{ duration: 0.08, repeat: Infinity }}
        >
          {reels[reelIndex].map((s, i) => (
            <div key={i} className="text-4xl h-[60px] flex items-center justify-center">{s}</div>
          ))}
        </motion.div>
      );
    }
    return (
      <motion.div
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
        className="text-5xl h-[60px] flex items-center justify-center"
      >
        {symbol}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col overflow-y-auto" style={{ background: "linear-gradient(180deg, hsl(350 60% 20%) 0%, hsl(340 70% 10%) 100%)" }}>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 py-2" style={{ background: "hsla(350, 50%, 30%, 0.5)" }}>
        <div className="flex items-center gap-1">
          {[
            { icon: Home, action: () => navigate("/") },
            { icon: soundOn ? Volume2 : VolumeX, action: () => setSoundOn(p => !p) },
          ].map((item, i) => (
            <button key={i} onClick={item.action} className="h-9 w-9 rounded-lg border-2 flex items-center justify-center"
              style={{ borderColor: "hsla(350, 50%, 50%, 0.5)", background: "hsla(350, 50%, 35%, 0.3)" }}>
              <item.icon className="h-4 w-4" style={{ color: "hsl(350, 20%, 85%)" }} />
            </button>
          ))}
        </div>
        <div className="rounded-lg px-3 py-1.5 text-right" style={{ background: "hsla(0, 0%, 100%, 0.85)" }}>
          <p className="text-[10px] leading-tight" style={{ color: "hsl(0, 0%, 50%)" }}>Round</p>
          <p className="font-bold text-sm leading-tight" style={{ color: "hsl(0, 0%, 20%)" }}>#{round}</p>
        </div>
      </div>

      {/* Title */}
      <div className="text-center pt-4 pb-2">
        <h1 className="text-2xl font-bold" style={{ color: "hsl(45, 90%, 70%)" }}>🎰 Lucky Slots</h1>
        <p className="text-xs mt-1" style={{ color: "hsl(350, 20%, 70%)" }}>Match symbols to win big!</p>
      </div>

      {/* Paytable */}
      <div className="px-4 mb-3">
        <div className="flex flex-wrap gap-1 justify-center">
          {SYMBOLS.map(s => (
            <div key={s} className="flex items-center gap-1 rounded-lg px-2 py-1" style={{ background: "hsla(0, 0%, 100%, 0.1)" }}>
              <span className="text-sm">{s}</span>
              <span className="text-[9px] font-bold" style={{ color: "hsl(45, 90%, 65%)" }}>{SYMBOL_PAYOUTS[s]}X</span>
            </div>
          ))}
        </div>
      </div>

      {/* Slot Machine */}
      <div className="px-4">
        <div className="rounded-3xl p-1" style={{ background: "linear-gradient(180deg, hsl(45, 80%, 55%), hsl(35, 70%, 40%))" }}>
          <div className="rounded-2xl p-4" style={{ background: "linear-gradient(180deg, hsl(350, 40%, 15%), hsl(340, 50%, 10%))" }}>
            {/* Reels */}
            <div className="flex items-center justify-center gap-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-20 h-[70px] rounded-xl overflow-hidden flex items-center justify-center"
                  style={{
                    background: "linear-gradient(180deg, hsl(0 0% 95%), hsl(0 0% 85%))",
                    border: "3px solid hsl(45, 80%, 50%)",
                    boxShadow: "inset 0 2px 8px hsla(0 0% 0% / 0.2)",
                  }}>
                  {renderSlotSymbol(finalSymbols[i], spinningReels[i], i)}
                </div>
              ))}
            </div>

            {/* Win line */}
            <div className="mt-2 h-0.5 rounded-full" style={{ background: "linear-gradient(90deg, transparent, hsl(45, 90%, 55%), transparent)" }} />
          </div>
        </div>
      </div>

      {/* Result */}
      <AnimatePresence>
        {phase === "result" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center my-3">
            {winAmount > 0 ? (
              <>
                <p className="text-xl font-bold" style={{ color: "hsl(50, 90%, 65%)" }}>
                  🎉 {finalSymbols[0] === finalSymbols[1] && finalSymbols[1] === finalSymbols[2] ? "JACKPOT!" : "WIN!"} {winAmount}
                </p>
                <p className="text-xs" style={{ color: "hsl(45, 70%, 60%)" }}>{finalSymbols.join(" ")}</p>
              </>
            ) : (
              <p className="text-xl font-bold" style={{ color: "hsl(0, 70%, 65%)" }}>😔 No Match - Lost {totalLost}</p>
            )}
            <p className="text-xs mt-1" style={{ color: "hsl(0, 0%, 60%)" }}>Next spin in {resultTimer}s</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bet Amount */}
      <div className="px-4 mt-2">
        <div className="rounded-2xl p-2" style={{ background: "hsla(0, 0%, 15%, 0.9)" }}>
          <div className="flex items-center justify-between rounded-xl overflow-hidden" style={{ background: "hsla(0, 0%, 25%, 0.8)" }}>
            <button
              onClick={() => { if (phase !== "betting") return; setSelectedBet(prev => Math.max(1, prev - 1)); }}
              disabled={phase !== "betting"}
              className="w-14 h-12 flex items-center justify-center text-2xl font-bold" style={{ color: "hsl(0, 0%, 70%)" }}>−</button>
            <div className="flex-1 text-center">
              <span className="text-xl font-bold" style={{ color: "hsl(50, 90%, 60%)" }}>
                {activeWallet === "dollar" ? `$${selectedBet.toFixed(2)}` : `${selectedBet.toFixed(2)} ⭐`}
              </span>
            </div>
            <button
              onClick={() => { if (phase !== "betting") return; setSelectedBet(prev => prev + 1); }}
              disabled={phase !== "betting"}
              className="w-14 h-12 flex items-center justify-center text-2xl font-bold" style={{ color: "hsl(0, 0%, 70%)" }}>+</button>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {BET_PRESETS.map((bet) => (
              <button key={bet} onClick={() => phase === "betting" && setSelectedBet(prev => prev + bet)}
                className={`rounded-xl py-2.5 text-sm font-bold transition-all ${phase !== "betting" ? "opacity-50" : ""}`}
                style={{
                  background: selectedBet === bet ? "hsl(350, 60%, 50%)" : "hsla(0, 0%, 30%, 0.8)",
                  color: selectedBet === bet ? "hsl(0, 0%, 100%)" : "hsl(0, 0%, 80%)",
                  border: selectedBet === bet ? "1px solid hsl(50, 90%, 55%)" : "1px solid hsla(0, 0%, 40%, 0.5)",
                }}>
                {activeWallet === "dollar" ? `$${bet}` : `${bet} ⭐`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Spin Button */}
      <div className="px-4 mt-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={spin}
          disabled={phase !== "betting" || currentBalance < selectedBet}
          className="w-full py-4 rounded-2xl text-lg font-bold transition-all"
          style={{
            background: phase === "betting"
              ? "linear-gradient(135deg, hsl(45, 90%, 55%), hsl(35, 85%, 45%))"
              : "hsla(0, 0%, 50%, 0.3)",
            color: phase === "betting" ? "hsl(0, 0%, 10%)" : "hsl(0, 0%, 60%)",
          }}
        >
          {phase === "betting" ? `🎰 Pull Lever - Bet ${activeWallet === "dollar" ? "$" : ""}${selectedBet}${activeWallet === "star" ? " ⭐" : ""}` : phase === "spinning" ? "Spinning..." : `Next in ${resultTimer}s`}
        </motion.button>
      </div>

      {/* Wallet */}
      <div className="px-4 mt-3 flex gap-2 items-center">
        <div className="flex-1 rounded-full px-3 py-2.5 flex items-center justify-center gap-1.5 border-2"
          style={{
            background: "hsla(0, 0%, 100%, 0.9)",
            borderColor: activeWallet === "star" ? "hsl(45, 90%, 50%)" : "hsl(350, 60%, 50%)",
          }}>
          {activeWallet === "star" ? (
            <>
              <span className="text-[10px] font-semibold" style={{ color: "hsl(0, 0%, 45%)" }}>Stars</span>
              <span className="text-base">⭐</span>
              <span className="font-bold text-sm" style={{ color: "hsl(45, 90%, 45%)" }}>{gameStarBalance.toLocaleString()}</span>
            </>
          ) : (
            <>
              <span className="text-[10px] font-semibold" style={{ color: "hsl(0, 0%, 45%)" }}>Balance</span>
              <span className="text-base">💲</span>
              <span className="font-bold text-sm" style={{ color: "hsl(0, 0%, 15%)" }}>{gameDollarBalance.toLocaleString()}</span>
            </>
          )}
        </div>
        <button
          onClick={() => phase === "betting" && setActiveWallet(prev => prev === "dollar" ? "star" : "dollar")}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 active:scale-90"
          style={{ background: "hsla(0, 0%, 100%, 0.95)", borderColor: "hsl(45, 80%, 55%)", opacity: phase !== "betting" ? 0.4 : 1 }}>
          <span className="text-xs">🔄</span>
        </button>
      </div>

      {/* Results History */}
      <div className="px-4 mt-3 mb-6">
        <div className="rounded-2xl p-3" style={{ background: "hsla(350, 40%, 15%, 0.8)" }}>
          <span className="text-xs font-bold" style={{ color: "hsl(0, 0%, 90%)" }}>Results History</span>
          <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-hide">
            {results.length > 0 ? results.map((r, i) => (
              <div key={i} className="flex items-center gap-0.5 px-2 h-8 rounded-full flex-shrink-0 border"
                style={{
                  background: r.win > 0 ? "hsla(45, 80%, 50%, 0.2)" : "hsla(0, 0%, 100%, 0.1)",
                  borderColor: r.win > 0 ? "hsl(45, 80%, 50%)" : "hsla(0, 0%, 100%, 0.15)",
                }}>
                {r.symbols.map((s, j) => (
                  <span key={j} className="text-xs">{s}</span>
                ))}
              </div>
            )) : (
              <p className="text-xs" style={{ color: "hsla(0, 0%, 100%, 0.5)" }}>Spin to see results...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LuckySlotsGame;
