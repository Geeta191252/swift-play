import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Diamond, Plus, ShoppingCart, User, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBalanceContext } from "@/contexts/BalanceContext";
import { getTelegramUser } from "@/lib/telegram";
import BottomNav from "./BottomNav";
import EarnScreen from "./EarnScreen";
import FriendsScreen from "./FriendsScreen";
import WalletScreen from "./WalletScreen";

import gameLogo from "@/assets/game-logo.jpg";
import greedyKingThumb from "@/assets/greedy-king-thumb.png";
import featuredFishing from "@/assets/featured-fishing.jpg";
import gameGreedyLion from "@/assets/game-greedy-lion.jpg";
import gameFruitMachine from "@/assets/game-fruit-machine.jpg";

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

const GameTile = ({ image, name, description, badge, badgeColor = "bg-green-500", delay = 0, onClick }: GameTileProps) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.3 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className="cursor-pointer flex-shrink-0 w-[140px]"
  >
    <div className="relative rounded-2xl overflow-hidden aspect-square mb-2">
      <img src={image} alt={name} className="w-full h-full object-cover" />
      {badge && (
        <span className={`absolute top-2 left-2 ${badgeColor} text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full`}>
          {badge}
        </span>
      )}
    </div>
    <h4 className="font-bold text-sm truncate" style={{ color: "hsl(0 0% 95%)" }}>{name}</h4>
    <p className="text-[11px] truncate" style={{ color: "hsl(0 0% 70%)" }}>{description}</p>
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
      background: "linear-gradient(180deg, hsl(260 60% 30%) 0%, hsl(280 50% 20%) 30%, hsl(320 40% 18%) 60%, hsl(350 45% 15%) 100%)",
    }}>
      {/* Top Bar */}
      <div className="sticky top-0 z-30 backdrop-blur-md px-3 py-2.5 flex items-center justify-between" style={{
        background: "hsla(260, 50%, 25%, 0.85)",
        borderBottom: "1px solid hsla(45, 80%, 50%, 0.2)",
      }}>
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-1 rounded-full px-2.5 py-1 shrink-0" style={{
            background: "linear-gradient(135deg, hsl(45 80% 50%), hsl(35 70% 40%))",
          }}>
            <span className="text-[10px]">💲</span>
            <span className="font-bold text-[10px]" style={{ color: "hsl(0 0% 10%)" }}>${totalDollar.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex items-center gap-1 rounded-full px-2.5 py-1 shrink-0" style={{
            background: "linear-gradient(135deg, hsl(200 70% 50%), hsl(220 60% 45%))",
          }}>
            <span className="text-[10px]">⭐</span>
            <span className="font-bold text-[10px]" style={{ color: "hsl(0 0% 100%)" }}>Star {totalStar.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isOwner && (
            <div
              onClick={goToAdmin}
              className="h-9 w-9 rounded-xl flex items-center justify-center cursor-pointer"
              style={{ background: "linear-gradient(135deg, hsl(0 70% 50%), hsl(30 80% 45%))" }}
            >
              <Shield className="h-4 w-4" style={{ color: "hsl(0 0% 100%)" }} />
            </div>
          )}
          <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{
            background: "linear-gradient(135deg, hsl(280 60% 55%), hsl(320 50% 45%))",
          }}>
            <ShoppingCart className="h-4 w-4" style={{ color: "hsl(0 0% 100%)" }} />
          </div>
          <div className="h-9 w-9 rounded-xl overflow-hidden" style={{
            border: "2px solid hsl(45 80% 55%)",
            background: "linear-gradient(135deg, hsl(260 40% 35%), hsl(280 30% 25%))",
          }}>
            <User className="h-full w-full p-1.5" style={{ color: "hsl(45 80% 70%)" }} />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 0 ? (
          <motion.div key="games" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {/* Content */}
            <div className="px-4 space-y-6 mt-2">


              {/* Wheel Category */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-lg" style={{ color: "hsl(280 70% 75%)" }}>🎡 Wheel</h2>
                  <button className="flex items-center gap-1 text-sm" style={{ color: "hsl(45 80% 65%)" }}>
                    View all <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  
                  <GameTile image={greedyKingThumb} name="Greedy King" description="Win more than FruitMachine" delay={0.15} onClick={goToGreedyKing} />
                  
                </div>
              </section>

              {/* Slots Category */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-lg" style={{ color: "hsl(0 70% 70%)" }}>🎰 Slots</h2>
                  <button className="flex items-center gap-1 text-sm" style={{ color: "hsl(45 80% 65%)" }}>
                    View all <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  <GameTile image={gameDice} name="Dice Master" description="Roll to earn coins" badge="New" delay={0.1} onClick={goToDiceMaster} />
                  <GameTile image={gameCarnivalSpin} name="Carnival Spin" description="Win prizes daily" delay={0.15} onClick={goToCarnivalSpin} />
                  <GameTile image={gameMines} name="Mines" description="Avoid the bombs!" badge="New" badgeColor="bg-red-500" delay={0.2} onClick={goToMines} />
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
