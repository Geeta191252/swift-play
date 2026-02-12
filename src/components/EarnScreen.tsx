import { motion } from "framer-motion";
import { Gift, Star, CheckCircle, Clock } from "lucide-react";

const tasks = [
  { icon: Gift, title: "Daily Login Bonus", reward: "⭐ 5", done: true },
  { icon: Star, title: "Play 3 Games", reward: "⭐ 10", done: false, progress: "1/3", percent: 33 },
  { icon: CheckCircle, title: "Get 5 Friends", reward: "⭐ 15", done: false, progress: "3/5", percent: 60 },
  { icon: Clock, title: "Watch an ad today 1/3 📺", reward: "⭐ 5", done: false, progress: "0/3", percent: 0 },
  { icon: Clock, title: "Watch an ad today 2/3 📺", reward: "⭐ 10", done: false, progress: "1/3", percent: 33 },
  { icon: Clock, title: "Watch an ad today 3/3 📺", reward: "⭐ 15", done: false, progress: "2/3", percent: 66 },
];

const EarnScreen = () => {
  return (
    <div className="px-4 pt-4 space-y-4">
      <h2 className="font-bold text-xl text-foreground">Earn Rewards</h2>
      <p className="text-sm text-muted-foreground">Complete tasks to earn diamonds!</p>

      <div className="space-y-3">
        {tasks.map((task, i) => (
          <motion.div
            key={task.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`flex items-center gap-3 p-4 rounded-2xl border ${
              task.done ? "bg-primary/10 border-primary/30" : "bg-card border-border"
            }`}
          >
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
              task.done ? "bg-primary/20" : "bg-muted"
            }`}>
              <task.icon className={`h-5 w-5 ${task.done ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1">
              <h4 className={`font-semibold text-sm ${task.done ? "text-primary line-through" : "text-foreground"}`}>
                {task.title}
              </h4>
              {task.progress && !task.done && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-primary font-semibold">{task.percent}%</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${task.percent}%` }} />
                  </div>
                </div>
              )}
            </div>
            <span className={`text-sm font-bold ${task.done ? "text-primary/50" : "text-primary"}`}>
              {task.reward}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default EarnScreen;
