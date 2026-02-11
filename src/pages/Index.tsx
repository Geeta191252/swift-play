import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SplashScreen from "@/components/SplashScreen";

const Index = () => {
  const [phase, setPhase] = useState<"preload" | "splash" | "ready">("preload");

  useEffect(() => {
    // Phase 1: Dark preload screen (1.5s)
    const t1 = setTimeout(() => setPhase("splash"), 1500);
    // Phase 2: Splash screen (3s)
    const t2 = setTimeout(() => setPhase("ready"), 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {/* Phase 1: Dark preload - subtle icon */}
        {phase === "preload" && (
          <motion.div
            key="preload"
            className="fixed inset-0 z-50 flex items-center justify-center bg-background"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.3, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="text-secondary"
            >
              <svg width="80" height="80" viewBox="0 0 80 80" fill="currentColor">
                <path d="M40 8c-4 0-7.5 1.5-10 4l-2 2.5c-1.5 2-3.5 3-6 3h-2c-5.5 0-10 4.5-10 10v2c0 2.5-1 4.5-3 6L4.5 38c-2.5 2.5-4 6-4 10s1.5 7.5 4 10l2.5 2c2 1.5 3 3.5 3 6v2c0 5.5 4.5 10 10 10h2c2.5 0 4.5 1 6 3l2 2.5c2.5 2.5 6 4 10 4s7.5-1.5 10-4l2-2.5c1.5-2 3.5-3 6-3h2c5.5 0 10-4.5 10-10v-2c0-2.5 1-4.5 3-6l2.5-2c2.5-2.5 4-6 4-10s-1.5-7.5-4-10l-2.5-2c-2-1.5-3-3.5-3-6v-2c0-5.5-4.5-10-10-10h-2c-2.5 0-4.5-1-6-3l-2-2.5c-2.5-2.5-6-4-10-4z" />
              </svg>
            </motion.div>
            {/* Bottom loading bar */}
            <div className="absolute bottom-8 left-8 right-8">
              <div className="h-1 overflow-hidden rounded-full bg-muted/20">
                <motion.div
                  className="h-full rounded-full bg-secondary"
                  initial={{ width: "0%" }}
                  animate={{ width: "40%" }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Phase 2: Main splash screen */}
        {phase === "splash" && <SplashScreen key="splash" />}

        {/* Phase 3: Ready - waiting for user's next instructions */}
        {phase === "ready" && (
          <motion.div
            key="ready"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex min-h-screen items-center justify-center"
          >
            <div className="text-center px-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground">
                <span className="font-game text-3xl text-background">G</span>
              </div>
              <h1 className="font-game text-2xl text-foreground mb-2">GAMEE</h1>
              <p className="text-sm text-muted-foreground">Welcome to the game!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
