import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, CircleHelp, Diamond, ChevronRight, History, Home, Trophy, Volume2, VolumeX, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { playBetSound, playSpinSound, playWinSound, playLoseSound, playCountdownBeep, playResultReveal, startBgMusic, stopBgMusic } from "@/hooks/useGameSounds";
import { useBalanceContext } from "@/contexts/BalanceContext";
import { reportGameResult, type CurrencyType } from "@/lib/telegram";

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

const DOLLAR_PLAYERS = [
  "Meer", "Ali Khan", "Hassan", "kailash", "Raj", "Amit K.", "Vikram", "Rohit P.",
  "Deepak", "Suresh B.", "Manish T.", "Arun S.", "Ravi G.", "Mukesh J.", "Sanjay M.",
  "Pankaj R.", "Rajesh K.", "Vinod L.", "Ashok P.", "Sunil J.", "Mohan S.", "Prakash D.",
  "Guest_fTZaai", "Guest_ClztlT", "Guest_xK9mL"
];

const STAR_PLAYERS = [
  "Ronnie H.", "Zara M.", "Guest_pQ7nR", "Priya S.", "Sara J.", "Neha R.",
  "Anita M.", "Kavita D.", "Pooja L.", "Divya K.", "Sunita P.", "Rekha V.",
  "Nisha A.", "Meena S.", "Swati N.", "Geeta D.", "Lata M.", "Kamla R.",
  "Usha K.", "Shanti V.", "Guest_mN3wX", "Guest_hY2kF", "Guest_tR8vB",
  "Guest_wL5cZ", "Guest_bN4qW"
];

const generateLeaderboard = (walletType: "dollar" | "star") => {
  const names = walletType === "dollar" ? DOLLAR_PLAYERS : STAR_PLAYERS;
  const seed = walletType === "dollar" ? 1 : 2;
  return names.map((name, i) => {
    const base = (i + 1) * seed * 7919;
    const totalGames = 50 + ((base * 31) % 450);
    const totalWins = Math.floor(totalGames * (0.2 + ((base * 17) % 60) / 100));
    const amount = walletType === "dollar"
      ? 8000000 - (i * ((base * 13) % 120000 + 50000))
      : 5000000 - (i * ((base * 11) % 100000 + 40000));
    return { name, totalGames, totalWins, amount: Math.max(amount, 1000 + ((base * 7) % 5000)) };
  }).sort((a, b) => b.amount - a.amount);
};

type GamePhase = "betting" | "countdown" | "spinning" | "result";

const GreedyKingGame = () => {
  const navigate = useNavigate();
  const [soundOn, setSoundOn] = useState(true);
  const soundRef = useRef(true);
  useEffect(() => { soundRef.current = soundOn; }, [soundOn]);
  const { dollarBalance, starBalance, refreshBalance } = useBalanceContext();
  const [localDollarAdj, setLocalDollarAdj] = useState(0);
  const [localStarAdj, setLocalStarAdj] = useState(0);
  const gameDollarBalance = dollarBalance + localDollarAdj;
  const gameStarBalance = starBalance + localStarAdj;
  const [todayProfits, setTodayProfits] = useState(0);
  const [activeWallet, setActiveWallet] = useState<"dollar" | "star">("dollar");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<"dollar" | "star">("dollar");
  const [selectedBet, setSelectedBet] = useState(10);
  const [userBets, setUserBets] = useState<number[]>(() => FOOD_ITEMS.map(() => 0));
  const [phase, setPhase] = useState<GamePhase>("betting");
  const [countdown, setCountdown] = useState(15);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [results, setResults] = useState<string[]>([]);
  const [todayRound, setTodayRound] = useState(381);
  const [currentWinner, setCurrentWinner] = useState<{ item: typeof FOOD_ITEMS[0]; index: number } | null>(null);
  const [winAmount, setWinAmount] = useState(0);
  const [totalLost, setTotalLost] = useState(0);
  const [resultTimer, setResultTimer] = useState(4);
  // Separate fake bets per wallet
  const [fakeBetsDollar] = useState<number[]>(() =>
    FOOD_ITEMS.map(() => Math.floor(Math.random() * 50) + 5)
  );
  const [fakeBetsStar] = useState<number[]>(() =>
    FOOD_ITEMS.map(() => Math.floor(Math.random() * 40) + 3)
  );
  const fakeBetCounts = activeWallet === "dollar" ? fakeBetsDollar : fakeBetsStar;
  const totalRotationRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userBetsRef = useRef<number[]>(FOOD_ITEMS.map(() => 0));

  useEffect(() => { userBetsRef.current = userBets; }, [userBets]);

  const totalUserBet = userBets.reduce((a, b) => a + b, 0);
  const hasBet = totalUserBet > 0;

  useEffect(() => {
    startBettingPhase();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopBgMusic();
    };
  }, []);

  // Toggle bg music with sound setting
  useEffect(() => {
    if (soundOn) startBgMusic();
    else stopBgMusic();
  }, [soundOn]);

  const startBettingPhase = useCallback(() => {
    setPhase("betting");
    setUserBets(FOOD_ITEMS.map(() => 0));
    setCurrentWinner(null);
    setWinAmount(0);
    setTotalLost(0);
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
        if (soundRef.current) playCountdownBeep();
        return prev - 1;
      });
    }, 1000);
  }, []);

  const startSpinning = useCallback(() => {
    setPhase("spinning");
    if (soundRef.current) playSpinSound();
    // Pick the fruit with the least total bets (user + fake bets)
    const bets = userBetsRef.current;
    const totalBetsPerFruit = FOOD_ITEMS.map((_, i) => bets[i] + fakeBetCounts[i]);
    const minBet = Math.min(...totalBetsPerFruit);
    // Get all fruits tied at minimum, pick randomly among them
    const minFruits = totalBetsPerFruit.map((b, i) => b === minBet ? i : -1).filter(i => i !== -1);
    const winnerIdx = minFruits[Math.floor(Math.random() * minFruits.length)];
    const extraSpins = 4 + Math.floor(Math.random() * 3);
    const targetAngle = totalRotationRef.current + (extraSpins * 360) + (360 - (winnerIdx * 45));
    totalRotationRef.current = targetAngle;
    setWheelAngle(targetAngle);

    setTimeout(() => {
      const won = FOOD_ITEMS[winnerIdx];
      if (soundRef.current) playResultReveal();
      setCurrentWinner({ item: won, index: winnerIdx });
      setResults(prev => [won.emoji, ...prev].slice(0, 12));
      setTodayRound(prev => prev + 1);

      const bets = userBetsRef.current;
      const totalBet = bets.reduce((a, b) => a + b, 0);

      if (totalBet > 0) {
        const betOnWinner = bets[winnerIdx];
        if (betOnWinner > 0) {
          const amount = betOnWinner * won.multiplier;
          const lostOnOthers = totalBet - betOnWinner;
          const netProfit = amount - lostOnOthers;
          setWinAmount(amount);
          setTotalLost(lostOnOthers);
          // Win goes to winning pool, not wallet
          setTodayProfits(p => p + netProfit);
          if (soundRef.current) playWinSound();
          // Report win to backend
          reportGameResult({ betAmount: totalBet, winAmount: amount, currency: activeWallet, game: "greedy-king" })
            .then(() => refreshBalance()).catch(console.error);
        } else {
          setWinAmount(0);
          setTotalLost(totalBet);
          setTodayProfits(p => p - totalBet);
          if (soundRef.current) playLoseSound();
          // Report loss to backend
          reportGameResult({ betAmount: totalBet, winAmount: 0, currency: activeWallet, game: "greedy-king" })
            .then(() => refreshBalance()).catch(console.error);
        }
      } else {
        setWinAmount(0);
        setTotalLost(0);
      }

      showResult();
    }, 4000);
  }, []);

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

  const betOnFruitClick = (fruitIndex: number) => {
    if (phase !== "betting") return;
    const currentBalance = activeWallet === "dollar" ? gameDollarBalance : gameStarBalance;
    if (currentBalance < selectedBet) return;
    if (activeWallet === "dollar") {
      setLocalDollarAdj(prev => prev - selectedBet);
    } else {
      setLocalStarAdj(prev => prev - selectedBet);
    }
    setUserBets(prev => {
      const copy = [...prev];
      copy[fruitIndex] += selectedBet;
      return copy;
    });
    if (soundRef.current) playBetSound();
  };

  const topBarItems = [
    { icon: Home, action: () => navigate("/") },
    { icon: soundOn ? Volume2 : VolumeX, action: () => setSoundOn(p => !p) },
    { icon: Trophy, action: () => setShowLeaderboard(true) },
  ];

  return (
    <div className="min-h-screen flex flex-col overflow-y-auto" style={{ background: "linear-gradient(180deg, hsl(45 90% 70%) 0%, hsl(35 95% 55%) 100%)" }}>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 py-2" style={{ background: "hsla(45, 80%, 60%, 0.5)" }}>
        <div className="flex items-center gap-1">
          {topBarItems.map((item, i) => (
            <button key={i} onClick={item.action} className="h-9 w-9 rounded-lg border-2 flex items-center justify-center"
              style={{ borderColor: "hsla(45, 80%, 45%, 0.5)", background: "hsla(45, 80%, 70%, 0.3)" }}>
              <item.icon className="h-4 w-4" style={{ color: "hsl(45, 30%, 25%)" }} />
            </button>
          ))}
        </div>
        <div className="rounded-lg px-3 py-1.5 text-right" style={{ background: "hsla(0, 0%, 100%, 0.85)" }}>
          <p className="text-[10px] leading-tight" style={{ color: "hsl(0, 0%, 50%)" }}>Today's</p>
          <p className="font-bold text-sm leading-tight" style={{ color: "hsl(0, 0%, 20%)" }}>{todayRound} Round</p>
        </div>
      </div>

      {/* Wheel */}
      <div className="flex flex-col items-center px-4 pt-2 pb-4">
        <div className="relative w-[300px] h-[300px] my-2">
          {/* Spokes */}
          <svg className="absolute inset-0 w-full h-full z-0" viewBox="0 0 300 300">
            {FOOD_ITEMS.map((_, i) => {
              const angle = (i * 45 - 90) * (Math.PI / 180);
              return (
                <line key={i} x1={150} y1={150} x2={150 + 110 * Math.cos(angle)} y2={150 + 110 * Math.sin(angle)} stroke="hsl(200 70% 60%)" strokeWidth="3" />
              );
            })}
          </svg>

          {/* Rotating food items */}
          <div className="absolute inset-0 z-10"
            style={{
              transform: `rotate(${wheelAngle}deg)`,
              transition: phase === "spinning" ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
            }}
          >
            {FOOD_ITEMS.map((food, i) => {
              const angle = (i * 45 - 90) * (Math.PI / 180);
              const r = 115;
              const x = 150 + r * Math.cos(angle);
              const y = 150 + r * Math.sin(angle);
              const myBet = userBets[i];
              const hasBetOnThis = myBet > 0;
              const currentBal = activeWallet === "dollar" ? gameDollarBalance : gameStarBalance;
              const canBet = phase === "betting" && currentBal >= selectedBet;

              return (
                <div key={i} className="absolute flex flex-col items-center"
                  style={{
                    left: x, top: y,
                    transform: `translate(-50%, -50%) rotate(-${wheelAngle}deg)`,
                    transition: phase === "spinning" ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
                  }}
                >
                  <button
                    onClick={() => betOnFruitClick(i)}
                    disabled={!canBet}
                    className="w-16 h-16 rounded-full border-[3px] flex flex-col items-center justify-center shadow-md transition-all relative"
                    style={{
                      borderColor: hasBetOnThis ? "hsl(220, 70%, 55%)" : "hsl(220, 70%, 55%)",
                      background: hasBetOnThis
                        ? "linear-gradient(180deg, hsla(30, 80%, 85%, 1) 0%, hsla(30, 70%, 75%, 1) 100%)"
                        : "white",
                      cursor: canBet ? "pointer" : "default",
                    }}
                  >
                    <span className={hasBetOnThis ? "text-base" : "text-xl"}>{food.emoji}</span>
                    {/* Show user's bet amount inside the circle */}
                    {hasBetOnThis && (
                      <div className="flex items-center gap-0.5 mt-[-2px]">
                        <span className="text-[7px] font-bold" style={{ color: "hsl(0, 60%, 45%)" }}>You:</span>
                        <Diamond className="h-2 w-2" style={{ color: "hsl(35, 90%, 50%)" }} />
                        <span className="text-[8px] font-bold" style={{ color: "hsl(35, 80%, 40%)" }}>{myBet}</span>
                      </div>
                    )}
                  </button>
                  {/* Win multiplier label */}
                  <span className="text-[8px] font-bold mt-0.5 px-1.5 rounded-full whitespace-nowrap" style={{
                    background: hasBetOnThis ? "hsla(30, 80%, 85%, 0.95)" : "hsla(210, 80%, 90%, 0.9)",
                    color: hasBetOnThis ? "hsl(0, 60%, 40%)" : "hsl(210, 60%, 30%)",
                  }}>
                    Win {food.multiplier}X
                  </span>
                  {i === 0 && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-white text-[7px] font-bold px-1.5 rounded-full" style={{ background: "hsl(0, 70%, 50%)" }}>
                      Hot
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Center */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center"
            style={{
              borderColor: (phase === "countdown" || phase === "spinning") ? "hsl(0, 0%, 15%)" : "hsl(0, 70%, 45%)",
              background: (phase === "countdown" || phase === "spinning") ? "hsl(0, 0%, 10%)" : "radial-gradient(circle, hsl(0 65% 55%), hsl(0 75% 40%))",
            }}
          >
            {phase === "betting" && (
              <>
                <span className="text-lg">🍴</span>
                <p className="text-[8px] text-white font-bold leading-tight">Select time</p>
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
                <span className="text-2xl">{currentWinner.item.emoji}</span>
                <p className="text-[8px] text-white font-bold">{currentWinner.item.name}</p>
              </>
            )}
          </div>

          {/* Top pointer */}
          <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 z-30 w-0 h-0"
            style={{ borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "14px solid hsl(0, 70%, 50%)" }}
          />
        </div>

        {/* Total bet info */}
        {hasBet && (
          <div className="mt-1 rounded-xl px-4 py-1.5 flex items-center gap-2" style={{ background: "hsla(0, 0%, 100%, 0.9)" }}>
            <span className="text-[10px] font-semibold" style={{ color: "hsl(0, 0%, 50%)" }}>Total bet:</span>
            <Diamond className="h-3 w-3 text-primary" />
            <span className="font-bold text-sm" style={{ color: "hsl(0, 0%, 15%)" }}>{totalUserBet}</span>
            <span className="text-[10px]" style={{ color: "hsl(0, 0%, 50%)" }}>
              on {userBets.filter(b => b > 0).length} fruit{userBets.filter(b => b > 0).length > 1 ? "s" : ""}
            </span>
          </div>
        )}

        {!hasBet && phase === "betting" && (
          <p className="mt-2 text-sm font-bold text-center" style={{ color: "hsl(0, 0%, 25%)" }}>
            👆 Tap fruits to place bets!
          </p>
        )}

        {/* Category buttons */}
        <div className="flex items-center justify-between w-full mt-3 px-2">
          <button className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: "hsla(0, 0%, 100%, 0.8)", color: "hsl(30, 30%, 25%)" }}>
            🥗 Salad <ChevronRight className="h-3 w-3" />
          </button>
          <button className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: "hsla(0, 0%, 100%, 0.8)", color: "hsl(30, 30%, 25%)" }}>
            🍕 Pizza <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {/* Bet Amount Options */}
        <div className="w-full mt-3 rounded-2xl p-3 flex gap-2 justify-center"
          style={{ background: "linear-gradient(180deg, hsl(200, 65%, 55%), hsl(210, 65%, 45%))" }}
        >
          {BET_OPTIONS.map((bet) => {
            const isActive = selectedBet === bet;
            return (
              <button key={bet} onClick={() => phase === "betting" && setSelectedBet(bet)}
                className={`flex-1 rounded-xl p-2 flex flex-col items-center border-2 transition-all ${phase !== "betting" ? "opacity-50" : ""}`}
                style={{
                  borderColor: isActive ? "hsl(50, 90%, 55%)" : "hsla(200, 50%, 70%, 0.4)",
                  background: isActive ? "hsl(0, 65%, 50%)" : "hsla(200, 50%, 60%, 0.4)",
                  transform: isActive ? "scale(1.05)" : "scale(1)",
                }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: isActive ? "hsl(50, 90%, 55%)" : "hsla(50, 70%, 60%, 0.6)",
                    color: isActive ? "hsl(0, 60%, 30%)" : "hsl(210, 40%, 20%)",
                  }}>
                  {bet >= 1000 ? `${bet / 1000}K` : bet}
                </div>
              </button>
            );
          })}
        </div>

        {/* Wallet with toggle */}
        <div className="w-full flex gap-2 mt-3 items-center">
          <div className="flex-1 rounded-full px-3 py-2.5 flex items-center justify-center gap-1.5 border-2"
            style={{
              background: "hsla(0, 0%, 100%, 0.9)",
              borderColor: activeWallet === "star" ? "hsl(45, 90%, 50%)" : activeWallet === "dollar" ? "hsl(140, 60%, 45%)" : "transparent",
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
              const hasBet = userBets.some(b => b > 0);
              if (phase !== "betting" || hasBet) return;
              setActiveWallet(prev => prev === "dollar" ? "star" : "dollar");
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 transition-all active:scale-90"
            style={{
              background: "hsla(0, 0%, 100%, 0.95)",
              borderColor: "hsl(45, 80%, 55%)",
              opacity: (phase !== "betting" || userBets.some(b => b > 0)) ? 0.4 : 1,
            }}
          >
            <span className="text-xs">🔄</span>
          </button>
        </div>

        {/* Results */}
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

      {/* Result Panel */}
      <AnimatePresence>
        {phase === "result" && currentWinner && (
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl shadow-2xl overflow-hidden"
            style={{ background: "white" }}
          >
            <div className="relative px-5 pt-5 pb-6">
              <div className="absolute top-3 right-4 flex items-center gap-1">
                <X className="h-4 w-4" style={{ color: "hsl(0, 0%, 60%)" }} />
                <span className="text-sm font-bold" style={{ color: "hsl(0, 0%, 50%)" }}>{resultTimer}s</span>
              </div>

              <div className="flex items-center justify-center gap-1 mb-3">
                <span className="text-lg opacity-40">🍴</span>
                <span className="text-lg opacity-40">🥄</span>
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="text-5xl">
                  {currentWinner.item.emoji}
                </motion.span>
                <span className="text-lg opacity-40">🔪</span>
                <span className="text-lg opacity-40">🍽️</span>
              </div>

              <p className="text-center text-sm font-semibold" style={{ color: "hsl(0, 0%, 30%)" }}>
                The {todayRound} round's result: {currentWinner.item.emoji}
              </p>

              {hasBet ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  {winAmount > 0 ? (
                    <p className="text-center font-bold text-lg mt-1" style={{ color: "hsl(140, 60%, 35%)" }}>
                      🎉 You won {winAmount} gems! (bet {userBets[currentWinner.index]} on {currentWinner.item.emoji})
                    </p>
                  ) : (
                    <p className="text-center font-bold text-lg mt-1" style={{ color: "hsl(0, 60%, 45%)" }}>
                      😅 You lost {totalLost} gems
                    </p>
                  )}
                </motion.div>
              ) : (
                <p className="text-center font-bold text-sm mt-1" style={{ color: "hsl(0, 0%, 30%)" }}>
                  You didn't play this round.
                </p>
              )}

              <div className="flex items-center gap-3 mt-4 mb-3">
              <div className="flex-1 h-px" style={{ background: "hsl(0, 0%, 85%)" }} />
              <span className="text-xs" style={{ color: "hsl(0, 0%, 55%)" }}>Leaderboard - Top Winners</span>
              <div className="flex-1 h-px" style={{ background: "hsl(0, 0%, 85%)" }} />
              </div>

              {(() => {
                // Build leaderboard: fake players + user
                const userTotalBet = userBets.reduce((a, b) => a + b, 0);
                const walletPlayers = activeWallet === "dollar" ? DOLLAR_PLAYERS : STAR_PLAYERS;
                const leaderboard = walletPlayers.slice(0, 5).map((name) => ({
                  name,
                  wallet: activeWallet,
                  amount: Math.floor(Math.random() * 500) + 50,
                }));
                leaderboard.push({
                  name: "You",
                  wallet: activeWallet,
                  amount: winAmount > 0 ? winAmount : 0,
                });
                leaderboard.sort((a, b) => b.amount - a.amount);
                const top3 = leaderboard.slice(0, 3);

                return (
                  <div className="flex items-start justify-center gap-6">
                    {top3.map((player, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.15 }} className="flex flex-col items-center">
                        <div className="relative">
                          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: player.name === "You" ? "hsl(45, 80%, 85%)" : "hsl(210, 20%, 85%)" }}>
                            <span className="text-2xl">{player.name === "You" ? "🙋" : "👤"}</span>
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                            style={{ background: i === 0 ? "hsl(50, 90%, 50%)" : i === 1 ? "hsl(210, 60%, 55%)" : "hsl(25, 70%, 55%)" }}>
                            {i + 1}
                          </div>
                        </div>
                        <p className="text-xs font-semibold mt-1.5 text-center max-w-[70px] truncate" style={{ color: "hsl(0, 0%, 25%)" }}>{player.name}</p>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          <span className="text-xs">{player.wallet === "dollar" ? "💲" : "⭐"}</span>
                          <span className="text-[10px] font-bold" style={{ color: "hsl(35, 90%, 45%)" }}>{player.amount}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leaderboard Modal */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: "linear-gradient(180deg, hsl(220, 60%, 15%) 0%, hsl(220, 70%, 8%) 100%)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3">
              <button onClick={() => setShowLeaderboard(false)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "hsla(0, 0%, 100%, 0.1)" }}>
                <X className="h-5 w-5" style={{ color: "hsl(0, 0%, 90%)" }} />
              </button>
              <h2 className="text-lg font-bold" style={{ color: "hsl(45, 90%, 65%)" }}>🏆 Leaderboard</h2>
              <div className="w-9" />
            </div>

            {/* Tabs */}
            <div className="flex mx-4 rounded-xl overflow-hidden mb-3" style={{ background: "hsla(0, 0%, 100%, 0.08)" }}>
              <button
                onClick={() => setLeaderboardTab("dollar")}
                className="flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-1.5 transition-all"
                style={{
                  background: leaderboardTab === "dollar" ? "linear-gradient(135deg, hsl(45, 90%, 55%), hsl(35, 85%, 45%))" : "transparent",
                  color: leaderboardTab === "dollar" ? "hsl(0, 0%, 10%)" : "hsl(0, 0%, 60%)",
                }}>
                💲 Dollar Ranking
              </button>
              <button
                onClick={() => setLeaderboardTab("star")}
                className="flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-1.5 transition-all"
                style={{
                  background: leaderboardTab === "star" ? "linear-gradient(135deg, hsl(270, 70%, 55%), hsl(280, 60%, 45%))" : "transparent",
                  color: leaderboardTab === "star" ? "hsl(0, 0%, 100%)" : "hsl(0, 0%, 60%)",
                }}>
                ⭐ Star Ranking
              </button>
            </div>

            {/* Player List */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
              {(() => {
                const players = generateLeaderboard(leaderboardTab);
                const currIcon = leaderboardTab === "dollar" ? "💲" : "⭐";

                return players.map((p, i) => {
                  const isTop3 = i < 3;
                  const cardBg = i === 0
                    ? "linear-gradient(135deg, hsl(45, 85%, 55%), hsl(40, 80%, 40%))"
                    : i === 1
                    ? "linear-gradient(135deg, hsl(200, 70%, 55%), hsl(210, 65%, 40%))"
                    : i === 2
                    ? "linear-gradient(135deg, hsl(15, 70%, 55%), hsl(10, 65%, 40%))"
                    : "linear-gradient(135deg, hsl(220, 60%, 25%), hsl(220, 55%, 20%))";

                  return (
                    <div key={i} className="rounded-xl px-3 py-3 relative overflow-hidden"
                      style={{ background: cardBg, border: isTop3 ? "1px solid hsla(0, 0%, 100%, 0.2)" : "1px solid hsla(0, 0%, 100%, 0.05)" }}>
                      {isTop3 && (
                        <div className="absolute top-1 right-2 text-3xl opacity-20">👑</div>
                      )}
                      <div className="flex items-center gap-3">
                        <span className="w-7 text-center font-bold text-base" style={{ color: "hsl(0, 0%, 100%)" }}>
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                        </span>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsla(0, 0%, 100%, 0.15)" }}>
                          <span className="text-lg">👤</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate" style={{ color: "hsl(0, 0%, 100%)" }}>{p.name}</p>
                          <p className="text-[10px]" style={{ color: "hsla(0, 0%, 100%, 0.6)" }}>
                            Betting: {currIcon} {p.amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 pl-10">
                        <span className="text-[10px]" style={{ color: "hsla(0, 0%, 100%, 0.5)" }}>
                          🎮 {p.totalGames} Games
                        </span>
                        <span className="text-[10px]" style={{ color: "hsla(0, 0%, 100%, 0.5)" }}>
                          🏆 {p.totalWins} Wins
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GreedyKingGame;
