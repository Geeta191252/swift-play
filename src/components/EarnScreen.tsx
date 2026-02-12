import { motion } from "framer-motion";
import clapperboardIcon from "@/assets/icon-clapperboard.png";

const tasks = [
  {
    title: "Watch an ad today 3/3 📺...",
    subtitle: "Watch an ad and earn. It's that ...",
    reward: 300,
    progress: "3/3",
  },
  {
    title: "Watch an ad today 2/3 📺...",
    subtitle: "Watch an ad and earn. It's that ...",
    reward: 200,
    progress: "2/3",
  },
  {
    title: "Watch an ad today 1/2 📺",
    subtitle: "Watch an ad and earn reward. I...",
    reward: 300,
    progress: "1/2",
  },
];

const EarnScreen = () => {
  return (
    <div className="px-4 pt-4 space-y-4">
      <h2 className="font-bold text-xl text-foreground flex items-center gap-2">
        🕹️ Daily tasks
      </h2>

      <div className="space-y-3">
        {tasks.map((task, i) => (
          <motion.div
            key={task.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-3 p-3 rounded-2xl bg-card/60 border border-border/50"
          >
            <div className="h-14 w-14 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 p-1.5">
              <img src={clapperboardIcon} alt="Ad" className="h-full w-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-foreground truncate">
                {task.title}
              </h4>
              <p className="text-xs text-muted-foreground truncate">
                {task.subtitle}
              </p>
            </div>
            <span className="text-xl font-bold text-foreground shrink-0">
              {task.reward}
            </span>
            <span className="text-lg shrink-0">⭐</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default EarnScreen;
