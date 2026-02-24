import { motion } from "framer-motion";
import splashLogo from "@/assets/splash-logo.png";
import { Loader2 } from "lucide-react";

const SplashScreen = () => {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-end bg-black"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Full Screen Image */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <img
          src={splashLogo}
          alt="RoyalKingGameBot"
          className="h-full w-full object-cover"
        />
      </motion.div>

      {/* Loading */}
      <motion.div
        className="relative z-10 mb-16 flex items-center gap-2 rounded-full bg-black/60 px-6 py-3 backdrop-blur-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <span className="font-game text-sm tracking-widest text-white">
          LOADING
        </span>
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </motion.div>
    </motion.div>
  );
};

export default SplashScreen;
