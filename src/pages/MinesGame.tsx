import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Volume2, VolumeX, Bomb, Diamond } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { playBetSound, playWinSound, playLoseSound, playResultReveal, startBgMusic, stopBgMusic } from "@/hooks/useGameSounds";
import { useBalanceContext } from "@/contexts/BalanceContext";
import { reportGameResult } from "@/lib/telegram";

const GRID_SIZE = 5;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
const MINE_OPTIONS = [1, 3, 5, 7, 10, 15];
const BET_PRESETS = [1, 3, 5, 10, 50];

type CellState = "hidden" | "safe" | "mine" | "revealed-mine";
type GamePhase = "betting" | "playing" | "lost" | "cashed";

const getMultiplier = (safePicks: number, totalMines: number): number => {
  if (safePicks <= 0) return 1;
  
  if (totalMines === 1) {
    // 1 Mine: Start 1.10x, grows very slow, mostly loss at 1.20x, rarely beyond 1.20x
    // Max reachable ~1.25x, heavy loss probability around 1.20x
    const multipliers = [
      1.10, 1.11, 1.12, 1.13, 1.14, 1.15, 1.16, 1.17, 1.18, 1.19,
      1.20, 1.20, 1.21, 1.21, 1.22, 1.22, 1.23, 1.23, 1.24, 1.24,
      1.25, 1.25, 1.25, 1.25
    ];
    const idx = Math.min(safePicks - 1, multipliers.length - 1);
    return multipliers[idx];
  }
  
  if (totalMines === 3) {
    // 3 Mines: Start 1.20x, max ~1.80x, mostly loses at 1.40x-1.60x
    const multipliers = [
      1.20, 1.22, 1.25, 1.28, 1.30, 1.33, 1.36, 1.38, 1.40, 1.43,
      1.45, 1.48, 1.50, 1.53, 1.55, 1.58, 1.60, 1.65, 1.70, 1.75,
      1.80, 1.80
    ];
    const idx = Math.min(safePicks - 1, multipliers.length - 1);
    return multipliers[idx];
  }
  
  // 5, 7, 10, 15 Mines: Same pattern as 3 mines
  const multipliers = [
    1.20, 1.22, 1.25, 1.28, 1.30, 1.33, 1.36, 1.38, 1.40, 1.43,
    1.45, 1.48, 1.50, 1.53, 1.55, 1.58, 1.60, 1.65, 1.70, 1.75,
    1.80, 1.80
  ];
  const idx = Math.min(safePicks - 1, multipliers.length - 1);
  return multipliers[idx];
};

const MinesGame = () => {
  const navigate = useNavigate();
  const [soundOn, setSoundOn] = useState(true);
  const soundRef = useRef(true);
  useEffect(() => { soundRef.current = soundOn; }, [soundOn]);

  const { dollarBalance, starBalance, dollarWinning, starWinning, refreshBalance } = useBalanceContext();
  const [localDollarAdj, setLocalDollarAdj] = useState(0);
  const [localStarAdj, setLocalStarAdj] = useState(0);
  const gameDollarBalance = dollarBalance + dollarWinning + localDollarAdj;
  const gameStarBalance = starBalance + starWinning + localStarAdj;

  const [activeWallet, setActiveWallet] = useState<"dollar" | "star">("dollar");
  const [selectedBet, setSelectedBet] = useState(1);
  const [mineCount, setMineCount] = useState(3);
  const [phase, setPhase] = useState<GamePhase>("betting");
  const [grid, setGrid] = useState<CellState[]>(Array(TOTAL_CELLS).fill("hidden"));
  const [minePositions, setMinePositions] = useState<Set<number>>(new Set());
  const [safePicks, setSafePicks] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [winAmount, setWinAmount] = useState(0);
  const [round, setRound] = useState(1);

  useEffect(() => {
    if (soundOn) startBgMusic();
    else stopBgMusic();
    return () => { stopBgMusic(); };
  }, [soundOn]);

  const currentBalance = activeWallet === "dollar" ? gameDollarBalance : gameStarBalance;

  const startGame = useCallback(() => {
    if (currentBalance < selectedBet) return;

    // Deduct bet
    if (activeWallet === "dollar") setLocalDollarAdj(p => p - selectedBet);
    else setLocalStarAdj(p => p - selectedBet);
    if (soundRef.current) playBetSound();

    // Place mines randomly
    const mines = new Set<number>();
    while (mines.size < mineCount) {
      mines.add(Math.floor(Math.random() * TOTAL_CELLS));
    }
    setMinePositions(mines);
    setGrid(Array(TOTAL_CELLS).fill("hidden"));
    setSafePicks(0);
    setCurrentMultiplier(1);
    setWinAmount(0);
    setPhase("playing");
  }, [currentBalance, selectedBet, activeWallet, mineCount]);

  const revealCell = useCallback((index: number) => {
    if (phase !== "playing" || grid[index] !== "hidden") return;

    const newGrid = [...grid];

    if (minePositions.has(index)) {
      // Hit a mine - reveal all mines
      newGrid[index] = "mine";
      minePositions.forEach(pos => {
        if (pos !== index) newGrid[pos] = "revealed-mine";
      });
      setGrid(newGrid);
      setPhase("lost");
      if (soundRef.current) playLoseSound();
      setRound(r => r + 1);
      // Report loss to backend
      reportGameResult({ betAmount: selectedBet, winAmount: 0, currency: activeWallet, game: "mines" })
        .then(() => { setLocalDollarAdj(0); setLocalStarAdj(0); refreshBalance(); }).catch(console.error);
    } else {
      // Safe pick
      newGrid[index] = "safe";
      setGrid(newGrid);
      const newSafePicks = safePicks + 1;
      setSafePicks(newSafePicks);
      const mult = getMultiplier(newSafePicks, mineCount);
      setCurrentMultiplier(mult);
      if (soundRef.current) playResultReveal();

      // Auto-win if all safe cells revealed
      if (newSafePicks >= TOTAL_CELLS - mineCount) {
        const prize = Math.floor(selectedBet * mult * 100) / 100;
        setWinAmount(prize);
        // Win goes to winning pool, not wallet

        setPhase("cashed");
        if (soundRef.current) playWinSound();
        setRound(r => r + 1);
        // Report win to backend
        reportGameResult({ betAmount: selectedBet, winAmount: prize, currency: activeWallet, game: "mines" })
          .then(() => { setLocalDollarAdj(0); setLocalStarAdj(0); refreshBalance(); }).catch(console.error);
      }
    }
  }, [phase, grid, minePositions, safePicks, mineCount, selectedBet, activeWallet]);

  const cashOut = useCallback(() => {
    if (phase !== "playing" || safePicks === 0) return;
    const prize = Math.floor(selectedBet * currentMultiplier * 100) / 100;
    setWinAmount(prize);
    // Win goes to winning pool, not wallet


    // Reveal all mines
    const newGrid = [...grid];
    minePositions.forEach(pos => { newGrid[pos] = "revealed-mine"; });
    setGrid(newGrid);

    setPhase("cashed");
    if (soundRef.current) playWinSound();
    setRound(r => r + 1);
    // Report cashout win to backend
    reportGameResult({ betAmount: selectedBet, winAmount: prize, currency: activeWallet, game: "mines" })
      .then(() => { setLocalDollarAdj(0); setLocalStarAdj(0); refreshBalance(); }).catch(console.error);
  }, [phase, safePicks, selectedBet, currentMultiplier, activeWallet, grid, minePositions, refreshBalance]);

  const nextMultiplier = phase === "playing" ? getMultiplier(safePicks + 1, mineCount) : 1;

  return (
    <div className="min-h-screen flex flex-col overflow-y-auto" style={{ background: "linear-gradient(180deg, hsl(260 55% 22%) 0%, hsl(250 60% 10%) 100%)" }}>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 py-2" style={{ background: "hsla(260, 40%, 30%, 0.6)" }}>
        <div className="flex items-center gap-1">
          {[
            { icon: Home, action: () => navigate("/") },
            { icon: soundOn ? Volume2 : VolumeX, action: () => setSoundOn(p => !p) },
          ].map((item, i) => (
            <button key={i} onClick={item.action} className="h-9 w-9 rounded-lg border-2 flex items-center justify-center"
              style={{ borderColor: "hsla(260, 40%, 50%, 0.5)", background: "hsla(260, 40%, 35%, 0.3)" }}>
              <item.icon className="h-4 w-4" style={{ color: "hsl(260, 20%, 85%)" }} />
            </button>
          ))}
        </div>
        <div className="rounded-lg px-3 py-1.5 text-right" style={{ background: "hsla(0, 0%, 100%, 0.85)" }}>
          <p className="text-[10px] leading-tight" style={{ color: "hsl(0, 0%, 50%)" }}>Round</p>
          <p className="font-bold text-sm leading-tight" style={{ color: "hsl(0, 0%, 20%)" }}>#{round}</p>
        </div>
      </div>

      {/* Title */}
      <div className="text-center pt-3 pb-1">
        <h1 className="text-2xl font-bold" style={{ color: "hsl(45, 90%, 70%)" }}>💣 Mines</h1>
        <p className="text-xs mt-1" style={{ color: "hsl(260, 20%, 70%)" }}>
          {phase === "playing" ? `Next: ${nextMultiplier.toFixed(2)}x • Current: ${currentMultiplier.toFixed(2)}x` : "Reveal tiles, avoid mines!"}
        </p>
      </div>

      {/* Multiplier bar during play */}
      {phase === "playing" && safePicks > 0 && (
        <div className="px-4 mb-2">
          <div className="rounded-xl p-2 flex items-center justify-between" style={{ background: "hsla(120, 60%, 30%, 0.4)", border: "1px solid hsla(120, 60%, 50%, 0.3)" }}>
            <span className="text-xs font-bold" style={{ color: "hsl(120, 60%, 70%)" }}>
              💎 {safePicks} safe • {currentMultiplier.toFixed(2)}x
            </span>
            <span className="text-sm font-bold" style={{ color: "hsl(50, 90%, 65%)" }}>
              {activeWallet === "dollar" ? "$" : ""}{(selectedBet * currentMultiplier).toFixed(2)}{activeWallet === "star" ? " ⭐" : ""}
            </span>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="px-4 flex justify-center">
        <div className="grid grid-cols-5 gap-2 w-full max-w-[320px]">
          {grid.map((cell, i) => (
            <motion.button
              key={i}
              whileTap={cell === "hidden" && phase === "playing" ? { scale: 0.9 } : {}}
              onClick={() => revealCell(i)}
              disabled={cell !== "hidden" || phase !== "playing"}
              className="aspect-square rounded-xl flex items-center justify-center text-lg font-bold transition-all relative overflow-hidden"
              style={{
                background:
                  cell === "hidden"
                    ? "linear-gradient(135deg, hsl(260 50% 35%), hsl(260 40% 28%))"
                    : cell === "safe"
                    ? "linear-gradient(135deg, hsl(160 60% 35%), hsl(140 50% 25%))"
                    : cell === "mine"
                    ? "linear-gradient(135deg, hsl(0 70% 45%), hsl(0 60% 30%))"
                    : "linear-gradient(135deg, hsl(0 40% 30%), hsl(0 30% 20%))",
                border: cell === "hidden" && phase === "playing"
                  ? "2px solid hsla(260, 50%, 55%, 0.6)"
                  : cell === "safe"
                  ? "2px solid hsla(160, 60%, 50%, 0.5)"
                  : cell === "mine"
                  ? "2px solid hsla(0, 70%, 55%, 0.5)"
                  : "2px solid hsla(0, 0%, 30%, 0.3)",
                boxShadow: cell === "hidden" && phase === "playing"
                  ? "0 4px 12px hsla(260, 50%, 20%, 0.5)"
                  : "none",
              }}
            >
              <AnimatePresence>
                {cell === "safe" && (
                  <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 12 }}>
                    <Diamond className="h-6 w-6" style={{ color: "hsl(160, 80%, 65%)" }} />
                  </motion.div>
                )}
                {(cell === "mine" || cell === "revealed-mine") && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }}>
                    <Bomb className="h-6 w-6" style={{ color: cell === "mine" ? "hsl(45, 90%, 65%)" : "hsl(0, 50%, 55%)" }} />
                  </motion.div>
                )}
                {cell === "hidden" && phase === "playing" && (
                  <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity }}
                    className="w-3 h-3 rounded-full" style={{ background: "hsla(260, 50%, 65%, 0.5)" }} />
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Result Display */}
      <AnimatePresence>
        {phase === "lost" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center my-3">
            <p className="text-xl font-bold" style={{ color: "hsl(0, 70%, 65%)" }}>💥 Boom! Lost {activeWallet === "dollar" ? "$" : ""}{selectedBet}{activeWallet === "star" ? " ⭐" : ""}</p>
          </motion.div>
        )}
        {phase === "cashed" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center my-3">
            <p className="text-xl font-bold" style={{ color: "hsl(50, 90%, 65%)" }}>🎉 Cashed Out {activeWallet === "dollar" ? "$" : ""}{winAmount.toFixed(2)}{activeWallet === "star" ? " ⭐" : ""}!</p>
            <p className="text-sm" style={{ color: "hsl(120, 50%, 65%)" }}>{currentMultiplier.toFixed(2)}x multiplier</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Button */}
      <div className="px-4 mt-2">
        {phase === "betting" || phase === "lost" || phase === "cashed" ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={startGame}
            disabled={currentBalance < selectedBet}
            className="w-full py-4 rounded-2xl text-lg font-bold"
            style={{
              background: currentBalance >= selectedBet
                ? "linear-gradient(135deg, hsl(260, 70%, 55%), hsl(300, 70%, 50%))"
                : "hsla(0, 0%, 50%, 0.3)",
              color: currentBalance >= selectedBet ? "white" : "hsl(0, 0%, 60%)",
            }}
          >
            {phase === "betting" ? "🎮 Start Game" : "🔄 Play Again"} — {activeWallet === "dollar" ? "$" : ""}{selectedBet}{activeWallet === "star" ? " ⭐" : ""}
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={cashOut}
            disabled={safePicks === 0}
            className="w-full py-4 rounded-2xl text-lg font-bold"
            style={{
              background: safePicks > 0
                ? "linear-gradient(135deg, hsl(120, 60%, 40%), hsl(160, 60%, 35%))"
                : "hsla(0, 0%, 50%, 0.3)",
              color: safePicks > 0 ? "white" : "hsl(0, 0%, 60%)",
            }}
          >
            💰 Cash Out — {activeWallet === "dollar" ? "$" : ""}{(selectedBet * currentMultiplier).toFixed(2)}{activeWallet === "star" ? " ⭐" : ""}
          </motion.button>
        )}
      </div>

      {/* Bet Controls (only in betting phase) */}
      {(phase === "betting" || phase === "lost" || phase === "cashed") && (
        <div className="px-4 mt-3 space-y-2">
          {/* Mine count selector */}
          <div className="rounded-2xl p-2" style={{ background: "hsla(0, 0%, 12%, 0.9)" }}>
            <p className="text-xs font-bold mb-1.5 px-1" style={{ color: "hsl(0, 0%, 70%)" }}>💣 Mines Count</p>
            <div className="flex gap-2">
              {MINE_OPTIONS.map(m => (
                <button key={m} onClick={() => setMineCount(m)}
                  className="flex-1 rounded-xl py-2 text-sm font-bold transition-all"
                  style={{
                    background: mineCount === m ? "hsl(0, 65%, 45%)" : "hsla(0, 0%, 25%, 0.8)",
                    color: mineCount === m ? "white" : "hsl(0, 0%, 75%)",
                    border: mineCount === m ? "1px solid hsl(45, 80%, 55%)" : "1px solid hsla(0, 0%, 35%, 0.5)",
                  }}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Bet amount */}
          <div className="rounded-2xl p-2" style={{ background: "hsla(0, 0%, 12%, 0.9)" }}>
            <div className="flex items-center justify-between rounded-xl overflow-hidden" style={{ background: "hsla(0, 0%, 25%, 0.8)" }}>
              <button onClick={() => setSelectedBet(prev => Math.max(1, prev - 1))}
                className="w-14 h-12 flex items-center justify-center text-2xl font-bold" style={{ color: "hsl(0, 0%, 70%)" }}>−</button>
              <div className="flex-1 text-center">
                <span className="text-xl font-bold" style={{ color: "hsl(50, 90%, 60%)" }}>
                  {activeWallet === "dollar" ? `$${selectedBet.toFixed(2)}` : `${selectedBet.toFixed(2)} ⭐`}
                </span>
              </div>
              <button onClick={() => setSelectedBet(prev => prev + 1)}
                className="w-14 h-12 flex items-center justify-center text-2xl font-bold" style={{ color: "hsl(0, 0%, 70%)" }}>+</button>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {BET_PRESETS.map(bet => (
                <button key={bet} onClick={() => setSelectedBet(prev => prev + bet)}
                  className="rounded-xl py-2.5 text-sm font-bold transition-all"
                  style={{
                    background: "hsla(0, 0%, 30%, 0.8)",
                    color: "hsl(0, 0%, 80%)",
                    border: "1px solid hsla(0, 0%, 40%, 0.5)",
                  }}>
                  {activeWallet === "dollar" ? `$${bet}` : `${bet} ⭐`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Wallet */}
      <div className="px-4 mt-3 mb-6 flex gap-2 items-center">
        <div className="flex-1 rounded-full px-3 py-2.5 flex items-center justify-center gap-1.5 border-2"
          style={{
            background: "hsla(0, 0%, 100%, 0.9)",
            borderColor: activeWallet === "star" ? "hsl(45, 90%, 50%)" : "hsl(260, 60%, 55%)",
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
          onClick={() => setActiveWallet(prev => prev === "dollar" ? "star" : "dollar")}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 active:scale-90"
          style={{ background: "hsla(0, 0%, 100%, 0.95)", borderColor: "hsl(45, 80%, 55%)" }}>
          <span className="text-xs">🔄</span>
        </button>
      </div>
    </div>
  );
};

export default MinesGame;
