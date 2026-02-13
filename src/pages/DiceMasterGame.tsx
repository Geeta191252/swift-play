import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Volume2, VolumeX, Trophy, X, Diamond, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { playBetSound, playSpinSound, playWinSound, playLoseSound, playCountdownBeep, playResultReveal, startBgMusic, stopBgMusic } from "@/hooks/useGameSounds";
import { useBalanceContext } from "@/contexts/BalanceContext";
import { reportGameResult, type CurrencyType } from "@/lib/telegram";

const DICE_FACES = [
  { value: 1, dots: "⚀", multiplier: 5 },
  { value: 2, dots: "⚁", multiplier: 3 },
  { value: 3, dots: "⚂", multiplier: 3 },
  { value: 4, dots: "⚃", multiplier: 3 },
  { value: 5, dots: "⚄", multiplier: 5 },
  { value: 6, dots: "⚅", multiplier: 10 },
];

const BET_PRESETS = [1, 3, 5, 10, 50];

type GamePhase = "betting" | "rolling" | "result";

const DiceMasterGame = () => {
  const navigate = useNavigate();
  const [soundOn, setSoundOn] = useState(true);
  const soundRef = useRef(true);
  useEffect(() => { soundRef.current = soundOn; }, [soundOn]);
  const { dollarBalance, starBalance, refreshBalance } = useBalanceContext();
  const [localDollarAdj, setLocalDollarAdj] = useState(0);
  const [localStarAdj, setLocalStarAdj] = useState(0);
  const gameDollarBalance = dollarBalance + localDollarAdj;
  const gameStarBalance = starBalance + localStarAdj;
  const [activeWallet, setActiveWallet] = useState<"dollar" | "star">("dollar");
  const [selectedBet, setSelectedBet] = useState(1);
  const [selectedDice, setSelectedDice] = useState<number | null>(null);
  const [phase, setPhase] = useState<GamePhase>("betting");
  const [rollingDice, setRollingDice] = useState([1, 1]);
  const [resultDice, setResultDice] = useState([1, 1]);
  const [winAmount, setWinAmount] = useState(0);
  const [totalLost, setTotalLost] = useState(0);
  const [results, setResults] = useState<number[]>([]);
  const [round, setRound] = useState(1);
  const [resultTimer, setResultTimer] = useState(3);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (soundOn) startBgMusic();
    else stopBgMusic();
    return () => { stopBgMusic(); };
  }, [soundOn]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
    };
  }, []);

  const currentBalance = activeWallet === "dollar" ? gameDollarBalance : gameStarBalance;

  const rollDice = () => {
    if (phase !== "betting" || selectedDice === null || currentBalance < selectedBet) return;

    // Deduct bet
    if (activeWallet === "dollar") setLocalDollarAdj(p => p - selectedBet);
    else setLocalStarAdj(p => p - selectedBet);

    if (soundRef.current) playBetSound();
    setPhase("rolling");

    // Animate dice rolling
    rollIntervalRef.current = setInterval(() => {
      setRollingDice([Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]);
    }, 80);

    setTimeout(() => {
      if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);

      // Rigged: make it hard to win - pick dice that don't match user's choice
      const otherValues = [1, 2, 3, 4, 5, 6].filter(v => v !== selectedDice);
      const shouldWin = Math.random() < 0.25; // 25% chance
      let d1: number, d2: number;

      if (shouldWin && selectedDice !== null) {
        d1 = selectedDice;
        d2 = Math.floor(Math.random() * 6) + 1;
      } else {
        d1 = otherValues[Math.floor(Math.random() * otherValues.length)];
        d2 = otherValues[Math.floor(Math.random() * otherValues.length)];
      }

      setResultDice([d1, d2]);
      setRollingDice([d1, d2]);
      if (soundRef.current) playResultReveal();

      const sum = d1 + d2;
      setResults(prev => [sum, ...prev].slice(0, 12));
      setRound(r => r + 1);

      // Check win: if either die matches selected
      const won = d1 === selectedDice || d2 === selectedDice;
      if (won) {
        const mult = DICE_FACES.find(f => f.value === selectedDice)!.multiplier;
        const prize = selectedBet * mult;
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
            setSelectedDice(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, 2000);
  };

  const renderDie = (value: number, size: number = 80, isRolling = false) => {
    const dotPositions: Record<number, [number, number][]> = {
      1: [[0.5, 0.5]],
      2: [[0.25, 0.25], [0.75, 0.75]],
      3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
      4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
      5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
      6: [[0.25, 0.2], [0.75, 0.2], [0.25, 0.5], [0.75, 0.5], [0.25, 0.8], [0.75, 0.8]],
    };
    const dots = dotPositions[value] || [];
    const dotSize = size * 0.14;

    return (
      <motion.div
        animate={isRolling ? { rotate: [0, 360], scale: [1, 1.1, 1] } : {}}
        transition={isRolling ? { duration: 0.3, repeat: Infinity } : {}}
        className="rounded-2xl relative shadow-xl"
        style={{
          width: size, height: size,
          background: "linear-gradient(145deg, hsl(0 0% 100%), hsl(0 0% 92%))",
          border: "3px solid hsl(0 0% 80%)",
          boxShadow: "inset 0 2px 4px hsla(0 0% 100% / 0.5), 0 4px 12px hsla(0 0% 0% / 0.2)",
        }}
      >
        {dots.map(([x, y], i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: dotSize, height: dotSize,
              left: x * size - dotSize / 2,
              top: y * size - dotSize / 2,
              background: "radial-gradient(circle, hsl(0 0% 15%), hsl(0 0% 25%))",
              boxShadow: "inset 0 1px 2px hsla(0 0% 0% / 0.3)",
            }}
          />
        ))}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col overflow-y-auto" style={{ background: "linear-gradient(180deg, hsl(140 40% 25%) 0%, hsl(150 50% 15%) 100%)" }}>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 py-2" style={{ background: "hsla(140, 40%, 30%, 0.5)" }}>
        <div className="flex items-center gap-1">
          {[
            { icon: Home, action: () => navigate("/") },
            { icon: soundOn ? Volume2 : VolumeX, action: () => setSoundOn(p => !p) },
          ].map((item, i) => (
            <button key={i} onClick={item.action} className="h-9 w-9 rounded-lg border-2 flex items-center justify-center"
              style={{ borderColor: "hsla(140, 40%, 50%, 0.5)", background: "hsla(140, 40%, 40%, 0.3)" }}>
              <item.icon className="h-4 w-4" style={{ color: "hsl(140, 20%, 85%)" }} />
            </button>
          ))}
        </div>
        <div className="rounded-lg px-3 py-1.5 text-right" style={{ background: "hsla(0, 0%, 100%, 0.85)" }}>
          <p className="text-[10px] leading-tight" style={{ color: "hsl(0, 0%, 50%)" }}>Round</p>
          <p className="font-bold text-sm leading-tight" style={{ color: "hsl(0, 0%, 20%)" }}>#{round}</p>
        </div>
      </div>

      {/* Game Title */}
      <div className="text-center pt-4 pb-2">
        <h1 className="text-2xl font-bold" style={{ color: "hsl(45, 90%, 70%)" }}>🎲 Dice Master</h1>
        <p className="text-xs mt-1" style={{ color: "hsl(140, 20%, 70%)" }}>Pick a number, roll the dice!</p>
      </div>

      {/* Dice Display */}
      <div className="flex items-center justify-center gap-6 py-6">
        {phase === "rolling" ? (
          <>
            {renderDie(rollingDice[0], 90, true)}
            {renderDie(rollingDice[1], 90, true)}
          </>
        ) : phase === "result" ? (
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
              {renderDie(resultDice[0], 90)}
            </motion.div>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}>
              {renderDie(resultDice[1], 90)}
            </motion.div>
          </>
        ) : (
          <>
            {renderDie(1, 90)}
            {renderDie(6, 90)}
          </>
        )}
      </div>

      {/* Result message */}
      <AnimatePresence>
        {phase === "result" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center mb-4">
            {winAmount > 0 ? (
              <p className="text-xl font-bold" style={{ color: "hsl(50, 90%, 65%)" }}>🎉 You Won {winAmount}!</p>
            ) : (
              <p className="text-xl font-bold" style={{ color: "hsl(0, 70%, 65%)" }}>😔 You Lost {totalLost}</p>
            )}
            <p className="text-xs mt-1" style={{ color: "hsl(0, 0%, 70%)" }}>Next round in {resultTimer}s</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pick Your Number */}
      <div className="px-4">
        <p className="text-sm font-bold mb-2 text-center" style={{ color: "hsl(0, 0%, 90%)" }}>
          {phase === "betting" ? "🎯 Pick Your Number" : phase === "rolling" ? "🎲 Rolling..." : ""}
        </p>
        <div className="grid grid-cols-6 gap-2 mb-4">
          {DICE_FACES.map((face) => (
            <button
              key={face.value}
              onClick={() => phase === "betting" && setSelectedDice(face.value)}
              disabled={phase !== "betting"}
              className="flex flex-col items-center rounded-xl py-3 border-2 transition-all"
              style={{
                borderColor: selectedDice === face.value ? "hsl(45, 90%, 55%)" : "hsla(0, 0%, 100%, 0.15)",
                background: selectedDice === face.value
                  ? "linear-gradient(180deg, hsl(45, 80%, 50%), hsl(35, 70%, 40%))"
                  : "hsla(0, 0%, 100%, 0.08)",
                transform: selectedDice === face.value ? "scale(1.05)" : "scale(1)",
              }}
            >
              {renderDie(face.value, 36)}
              <span className="text-[9px] font-bold mt-1" style={{
                color: selectedDice === face.value ? "hsl(0, 0%, 10%)" : "hsl(0, 0%, 80%)"
              }}>{face.multiplier}X</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bet Amount */}
      <div className="px-4">
        {/* +/- Control */}
        <div className="rounded-2xl p-2 mb-2" style={{ background: "hsla(0, 0%, 15%, 0.9)" }}>
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
          {/* Preset buttons */}
          <div className="grid grid-cols-4 gap-2 mt-2">
            {BET_PRESETS.map((bet) => (
              <button key={bet} onClick={() => phase === "betting" && setSelectedBet(prev => prev + bet)}
                className={`rounded-xl py-2.5 text-sm font-bold transition-all ${phase !== "betting" ? "opacity-50" : ""}`}
                style={{
                  background: selectedBet === bet ? "hsl(0, 65%, 50%)" : "hsla(0, 0%, 30%, 0.8)",
                  color: selectedBet === bet ? "hsl(0, 0%, 100%)" : "hsl(0, 0%, 80%)",
                  border: selectedBet === bet ? "1px solid hsl(50, 90%, 55%)" : "1px solid hsla(0, 0%, 40%, 0.5)",
                }}>
                {activeWallet === "dollar" ? `$${bet}` : `${bet} ⭐`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Roll Button */}
      <div className="px-4 mt-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={rollDice}
          disabled={phase !== "betting" || selectedDice === null || currentBalance < selectedBet}
          className="w-full py-4 rounded-2xl text-lg font-bold transition-all"
          style={{
            background: phase === "betting" && selectedDice !== null
              ? "linear-gradient(135deg, hsl(45, 90%, 55%), hsl(35, 85%, 45%))"
              : "hsla(0, 0%, 50%, 0.3)",
            color: phase === "betting" && selectedDice !== null ? "hsl(0, 0%, 10%)" : "hsl(0, 0%, 60%)",
          }}
        >
          {phase === "betting"
            ? selectedDice === null ? "Select a Number First" : `🎲 Roll Dice - Bet ${activeWallet === "dollar" ? "$" : ""}${selectedBet}${activeWallet === "star" ? " ⭐" : ""}`
            : phase === "rolling" ? "Rolling..." : `Next in ${resultTimer}s`}
        </motion.button>
      </div>

      {/* Wallet toggle */}
      <div className="px-4 mt-3 flex gap-2 items-center">
        <div className="flex-1 rounded-full px-3 py-2.5 flex items-center justify-center gap-1.5 border-2"
          style={{
            background: "hsla(0, 0%, 100%, 0.9)",
            borderColor: activeWallet === "star" ? "hsl(45, 90%, 50%)" : "hsl(140, 60%, 45%)",
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
          onClick={() => {
            if (phase !== "betting") return;
            setActiveWallet(prev => prev === "dollar" ? "star" : "dollar");
          }}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 transition-all active:scale-90"
          style={{
            background: "hsla(0, 0%, 100%, 0.95)",
            borderColor: "hsl(45, 80%, 55%)",
            opacity: phase !== "betting" ? 0.4 : 1,
          }}>
          <span className="text-xs">🔄</span>
        </button>
      </div>

      {/* Results History */}
      <div className="px-4 mt-3 mb-6">
        <div className="rounded-2xl p-3" style={{ background: "hsla(140, 40%, 20%, 0.8)" }}>
          <span className="text-xs font-bold" style={{ color: "hsl(0, 0%, 90%)" }}>Results History</span>
          <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-hide">
            {results.length > 0 ? results.map((sum, i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 border" style={{ borderColor: "hsla(140, 40%, 50%, 0.3)" }}>
                <span className="text-sm font-bold" style={{ color: "hsl(140, 40%, 25%)" }}>{sum}</span>
              </div>
            )) : (
              <p className="text-xs" style={{ color: "hsla(0, 0%, 100%, 0.5)" }}>Roll the dice to see results...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiceMasterGame;
