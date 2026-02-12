import navGames from "@/assets/nav-games.png";
import navEarn from "@/assets/nav-earn.png";
import navFriends from "@/assets/nav-friends.png";
import navWallet from "@/assets/nav-wallet.png";

const tabs = [
  { icon: navGames, label: "Games" },
  { icon: navEarn, label: "Earn" },
  { icon: navFriends, label: "Invite" },
  { icon: navWallet, label: "Wallet" },
];

interface BottomNavProps {
  activeTab: number;
  onTabChange: (index: number) => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/90 backdrop-blur-lg">
      <div className="mx-auto flex max-w-md items-center justify-around py-1">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => onTabChange(i)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-all ${
              activeTab === i ? "scale-110" : "opacity-60"
            }`}
          >
            <img src={tab.icon} alt={tab.label} className="h-10 w-10 object-contain" />
            <span className={`text-[10px] font-semibold ${
              activeTab === i ? "text-primary" : "text-muted-foreground"
            }`}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BottomNav;
