import { motion } from "framer-motion";
import splashBg from "@/assets/splash-bg.jpg";
import gameLogo from "@/assets/game-logo.jpg";
import { Loader2 } from "lucide-react";

const SplashScreen = () => {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={splashBg}
          alt=""
          className="h-full w-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-background/40" />
      </div>

      {/* Logo */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-4"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <img src={gameLogo} alt="Greedy King" className="h-28 w-28 rounded-2xl shadow-2xl object-cover" />
        <h1 className="font-game text-4xl tracking-wider text-foreground text-glow">
          Greedy King
        </h1>
      </motion.div>

      {/* Loading */}
      <motion.div
        className="absolute bottom-20 z-10 flex items-center gap-2 rounded-full bg-muted/80 px-6 py-3 backdrop-blur-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <span className="font-game text-sm tracking-widest text-foreground">
          LOADING
        </span>
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </motion.div>
    </motion.div>
  );
};

export default SplashScreen;
