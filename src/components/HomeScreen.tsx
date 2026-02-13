import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Diamond, Plus, ShoppingCart, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBalanceContext } from "@/contexts/BalanceContext";
import BottomNav from "./BottomNav";
import EarnScreen from "./EarnScreen";
import FriendsScreen from "./FriendsScreen";
import WalletScreen from "./WalletScreen";

import gameLogo from "@/assets/game-logo.jpg";
import greedyKingThumb from "@/assets/greedy-king-thumb.png";
import featuredFishing from "@/assets/featured-fishing.jpg";
import gameGreedyLion from "@/assets/game-greedy-lion.jpg";
import gameFruitMachine from "@/assets/game-fruit-machine.jpg";
import gameSlots from "@/assets/game-slots.jpg";
import gameDice from "@/assets/game-dice.jpg";

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
    <h4 className="font-bold text-sm text-foreground truncate">{name}</h4>
    <p className="text-[11px] text-muted-foreground truncate">{description}</p>
  </motion.div>
);

const HomeScreen = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const { dollarBalance, starBalance } = useBalanceContext();
  const goToGreedyKing = () => navigate("/greedy-king");
  const goToDiceMaster = () => navigate("/dice-master");
  const goToCarnivalSpin = () => navigate("/carnival-spin");
  const goToLuckySlots = () => navigate("/lucky-slots");

  const renderTabContent = () => {
    switch (activeTab) {
      case 1: return <EarnScreen />;
      case 2: return <FriendsScreen />;
      case 3: return <WalletScreen />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-1 bg-card rounded-full px-2 py-1 shrink-0">
            <span className="text-[10px]">💲</span>
            <span className="font-bold text-[10px] text-foreground">${dollarBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex items-center gap-1 bg-card rounded-full px-2 py-1 shrink-0">
            <span className="text-[10px]">⭐</span>
            <span className="font-bold text-[10px] text-foreground">Star {starBalance.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center">
            <ShoppingCart className="h-4 w-4 text-primary" />
          </div>
          <div className="h-9 w-9 rounded-xl overflow-hidden border-2 border-primary/40">
            <User className="h-full w-full p-1.5 text-muted-foreground" />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 0 ? (
          <motion.div key="games" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {/* Content */}
            <div className="px-4 space-y-6 mt-2">
              {/* Featured */}
              <section>
                <h2 className="font-bold text-lg text-foreground mb-3">Featured</h2>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative rounded-2xl overflow-hidden cursor-pointer"
                >
                  <img src={featuredFishing} alt="Fishing Star 2" className="w-full h-44 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="bg-green-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">New</span>
                    <span className="bg-secondary text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">Fishing</span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <div>
                      <h3 className="font-bold text-foreground text-base">Fishing Star 2</h3>
                      <p className="text-[11px] text-foreground/70">New fishing star is coming</p>
                    </div>
                    <button className="bg-foreground text-background text-xs font-bold px-4 py-2 rounded-full">
                      Play
                    </button>
                  </div>
                </motion.div>
              </section>

              {/* Recently Played */}
              <section>
                <h2 className="font-bold text-lg text-foreground mb-3">Recently Played</h2>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  <GameTile
                    image={greedyKingThumb}
                    name="Greedy King"
                    description="Win more than FruitMachine"
                    badge="Wheel"
                    badgeColor="bg-zinc-800"
                    delay={0.1}
                    onClick={goToGreedyKing}
                  />
                </div>
              </section>

              {/* Wheel Category */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-lg text-foreground">Wheel</h2>
                  <button className="flex items-center gap-1 text-sm text-muted-foreground">
                    View all <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  <GameTile image={gameGreedyLion} name="Greedy Lion" description="Spin to win 45" badge="New" delay={0.1} />
                  <GameTile image={greedyKingThumb} name="Greedy King" description="Win more than FruitMachine" delay={0.15} onClick={goToGreedyKing} />
                  <GameTile image={gameFruitMachine} name="FruitMachine" description="Spin to win!" badge="TOP" badgeColor="bg-orange-500" delay={0.2} />
                </div>
              </section>

              {/* Slots Category */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-lg text-foreground">Slots</h2>
                  <button className="flex items-center gap-1 text-sm text-muted-foreground">
                    View all <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  <GameTile image={gameSlots} name="Lucky Slots" description="Spin & Win big!" badge="Hot" badgeColor="bg-red-500" delay={0.1} onClick={goToLuckySlots} />
                  <GameTile image={gameDice} name="Dice Master" description="Roll to earn coins" badge="New" delay={0.15} onClick={goToDiceMaster} />
                  <GameTile image={gameGreedyLion} name="Carnival Spin" description="Win prizes daily" delay={0.2} onClick={goToCarnivalSpin} />
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
