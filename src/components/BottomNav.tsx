import { Gamepad2, Trophy, Users, Wallet } from "lucide-react";

const tabs = [
  { icon: Gamepad2, label: "Games" },
  { icon: Trophy, label: "Earn" },
  { icon: Users, label: "Friends" },
  { icon: Wallet, label: "Wallet" },
];

interface BottomNavProps {
  activeTab: number;
  onTabChange: (index: number) => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/90 backdrop-blur-lg">
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => onTabChange(i)}
            className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
              activeTab === i ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <tab.icon className="h-5 w-5" />
            <span className="text-[10px] font-semibold">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BottomNav;
