import { motion } from "framer-motion";
import clapperboardIcon from "@/assets/icon-clapperboard.png";

const tasks = [
  {
    title: "Watch ads 1/5 📺",
    subtitle: "Watch 5 ads and earn 5 ⭐",
    reward: 5,
    progress: "1/5",
  },
  {
    title: "Watch ads 5/10 📺",
    subtitle: "Watch 10 ads and earn 5 ⭐",
    reward: 5,
    progress: "5/10",
  },
  {
    title: "Watch ads 10/15 📺",
    subtitle: "Watch 15 ads and earn 5 ⭐",
    reward: 5,
    progress: "10/15",
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

      <div className="text-xs text-muted-foreground text-center px-2 space-y-1">
        <p>📌 1 ad dekhne par 1 ⭐ milega, 10 ads dekhne par 10 ⭐ milenge!</p>
        <p>📌 Watch 1 ad to earn 1 ⭐, watch 10 ads to earn 10 ⭐!</p>
      </div>
    </div>
  );
};

export default EarnScreen;
