import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ShoppingCart, User, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBalanceContext } from "@/contexts/BalanceContext";
import { getTelegramUser } from "@/lib/telegram";
import BottomNav from "./BottomNav";
import EarnScreen from "./EarnScreen";
import FriendsScreen from "./FriendsScreen";
import WalletScreen from "./WalletScreen";

import greedyKingThumb from "@/assets/greedy-king-thumb.png";
import gameDice from "@/assets/game-dice.jpg";
import gameCarnivalSpin from "@/assets/game-carnival-spin.jpg";
import gameMines from "@/assets/game-mines.jpg";

interface GameTileProps {
  image: string;
  name: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  delay?: number;
  onClick?: () => void;
}

const GameTile = ({ image, name, description, badge, badgeColor = "bg-emerald-500", delay = 0, onClick }: GameTileProps) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.3 }}
    whileTap={{ scale: 0.93 }}
    onClick={onClick}
    className="cursor-pointer flex-shrink-0 w-[150px]"
  >
    <div className="relative rounded-2xl overflow-hidden aspect-square mb-2 shadow-lg" style={{
      boxShadow: "0 8px 24px hsla(0, 0%, 0%, 0.4), 0 0 12px hsla(280, 60%, 50%, 0.2)"
    }}>
      <img src={image} alt={name} className="w-full h-full object-cover" />
      <div className="absolute inset-0" style={{
        background: "linear-gradient(180deg, transparent 60%, hsla(0,0%,0%,0.5) 100%)"
      }} />
      {badge && (
        <span className={`absolute top-2 left-2 ${badgeColor} text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-md`}>
          {badge}
        </span>
      )}
    </div>
    <h4 className="font-bold text-sm truncate" style={{ color: "hsl(0 0% 95%)" }}>{name}</h4>
    <p className="text-[11px] truncate" style={{ color: "hsl(260 30% 70%)" }}>{description}</p>
  </motion.div>
);

const HomeScreen = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const { dollarBalance, starBalance, dollarWinning, starWinning } = useBalanceContext();
  const totalDollar = dollarBalance + dollarWinning;
  const totalStar = starBalance + starWinning;
  const goToGreedyKing = () => navigate("/greedy-king");
  const goToDiceMaster = () => navigate("/dice-master");
  const goToCarnivalSpin = () => navigate("/carnival-spin");
  const goToMines = () => navigate("/mines");
  const goToAdmin = () => navigate("/admin");

  const telegramUser = getTelegramUser();
  const isOwner = telegramUser?.id === 6965488457;

  const renderTabContent = () => {
    switch (activeTab) {
      case 1: return <EarnScreen />;
      case 2: return <FriendsScreen />;
      case 3: return <WalletScreen />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen pb-20" style={{
      background: "linear-gradient(180deg, hsl(260 55% 28%) 0%, hsl(270 45% 18%) 40%, hsl(280 40% 12%) 100%)",
    }}>
      {/* Top Bar */}
      <div className="sticky top-0 z-30 px-3 py-3 flex items-center justify-between" style={{
        background: "linear-gradient(135deg, hsl(260 55% 32%) 0%, hsl(275 50% 28%) 100%)",
        borderBottom: "1px solid hsla(280, 60%, 50%, 0.25)",
        boxShadow: "0 4px 20px hsla(260, 50%, 15%, 0.5)",
      }}>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {/* Dollar badge */}
          <motion.div 
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 shrink-0 cursor-pointer" 
            style={{
              background: "linear-gradient(135deg, hsl(140 60% 40%), hsl(160 50% 35%))",
              boxShadow: "0 2px 10px hsla(140, 60%, 40%, 0.3)",
            }}
          >
            <span className="text-xs font-black" style={{ color: "hsl(0 0% 100%)" }}>$</span>
            <span className="font-bold text-xs" style={{ color: "hsl(0 0% 100%)" }}>
              {totalDollar.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </motion.div>
          {/* Star badge */}
          <motion.div 
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 shrink-0 cursor-pointer" 
            style={{
              background: "linear-gradient(135deg, hsl(200 80% 50%), hsl(230 70% 55%))",
              boxShadow: "0 2px 10px hsla(200, 80%, 50%, 0.3)",
            }}
          >
            <span className="text-xs">⭐</span>
            <span className="font-bold text-xs" style={{ color: "hsl(0 0% 100%)" }}>
              Star {totalStar.toLocaleString()}
            </span>
          </motion.div>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <motion.div
              whileTap={{ scale: 0.9 }}
              onClick={goToAdmin}
              className="h-9 w-9 rounded-xl flex items-center justify-center cursor-pointer"
              style={{ 
                background: "linear-gradient(135deg, hsl(0 70% 55%), hsl(20 80% 50%))",
                boxShadow: "0 2px 10px hsla(0, 70%, 50%, 0.3)",
              }}
            >
              <Shield className="h-4 w-4" style={{ color: "hsl(0 0% 100%)" }} />
            </motion.div>
          )}
          <motion.div 
            whileTap={{ scale: 0.9 }}
            className="h-9 w-9 rounded-xl flex items-center justify-center cursor-pointer" 
            style={{
              background: "linear-gradient(135deg, hsl(310 60% 55%), hsl(280 50% 45%))",
              boxShadow: "0 2px 10px hsla(310, 60%, 50%, 0.3)",
            }}
          >
            <ShoppingCart className="h-4 w-4" style={{ color: "hsl(0 0% 100%)" }} />
          </motion.div>
          <motion.div 
            whileTap={{ scale: 0.9 }}
            className="h-9 w-9 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer" 
            style={{
              border: "2px solid hsl(45 80% 55%)",
              background: "linear-gradient(135deg, hsl(45 70% 50%), hsl(35 60% 40%))",
              boxShadow: "0 2px 10px hsla(45, 80%, 50%, 0.3)",
            }}
          >
            <User className="h-4 w-4" style={{ color: "hsl(0 0% 10%)" }} />
          </motion.div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 0 ? (
          <motion.div key="games" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="px-4 space-y-6 mt-4">

              {/* Wheel Category */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <motion.h2 
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    className="font-bold text-lg flex items-center gap-2"
                    style={{ color: "hsl(45 90% 65%)" }}
                  >
                    🎡 <span style={{ 
                      background: "linear-gradient(135deg, hsl(45 90% 65%), hsl(30 80% 55%))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}>Wheel</span>
                  </motion.h2>
                  <button className="flex items-center gap-1 text-sm font-medium" style={{ color: "hsl(45 80% 65%)" }}>
                    View all <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  <GameTile image={greedyKingThumb} name="Greedy King" description="Win more than FruitMachine" delay={0.1} onClick={goToGreedyKing} />
                </div>
              </section>

              {/* Divider */}
              <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(280 50% 40%), transparent)" }} />

              {/* Slots Category */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <motion.h2 
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                    className="font-bold text-lg flex items-center gap-2"
                  >
                    🎰 <span style={{
                      background: "linear-gradient(135deg, hsl(0 75% 65%), hsl(330 70% 60%))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}>Slots</span>
                  </motion.h2>
                  <button className="flex items-center gap-1 text-sm font-medium" style={{ color: "hsl(45 80% 65%)" }}>
                    View all <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  <GameTile image={gameDice} name="Dice Master" description="Roll to earn coins" badge="New" delay={0.1} onClick={goToDiceMaster} />
                  <GameTile image={gameCarnivalSpin} name="Carnival Spin" description="Win prizes daily" delay={0.15} onClick={goToCarnivalSpin} />
                  <GameTile image={gameMines} name="Mines" description="Avoid the bombs!" badge="New" badgeColor="bg-rose-500" delay={0.2} onClick={goToMines} />
                </div>
              </section>

            </div>
          </motion.div>
        ) : (
          <motion.div key={`tab-${activeTab}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {renderTabContent()}
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default HomeScreen;
