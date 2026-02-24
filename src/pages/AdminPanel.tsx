import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Star, DollarSign, RefreshCw, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getTelegramUser } from "@/lib/telegram";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://broken-bria-chetan1-ea890b93.koyeb.app/api";
const OWNER_ID = 6965488457;

interface AdminStats {
  totalStarsEarned: number;
  starDepositCount: number;
  totalDollarsEarned: number;
  dollarDepositCount: number;
  totalUsers: number;
  recentTransactions: Array<{
    telegramId: number;
    type: string;
    currency: string;
    amount: number;
    createdAt: string;
    description?: string;
  }>;
}

const AdminPanel = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [message, setMessage] = useState("");

  const user = getTelegramUser();
  const isOwner = user?.id === OWNER_ID;

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId: String(OWNER_ID) }),
      });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch stats", e);
    }
    setLoading(false);
  };

  const cleanupWins = async () => {
    setCleaning(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/cleanup-wins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId: String(OWNER_ID) }),
      });
      const data = await res.json();
      setMessage(data.message || "Done");
      fetchStats();
    } catch (e) {
      setMessage("Cleanup failed");
    }
    setCleaning(false);
  };

  useEffect(() => {
    if (isOwner) fetchStats();
  }, []);

  if (!isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(260 60% 15%)" }}>
        <p style={{ color: "hsl(0 70% 60%)" }} className="text-lg font-bold">⛔ Access Denied</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8" style={{
      background: "linear-gradient(180deg, hsl(260 60% 20%) 0%, hsl(280 50% 15%) 100%)",
    }}>
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-md px-4 py-3 flex items-center gap-3" style={{
        background: "hsla(260, 50%, 20%, 0.9)",
        borderBottom: "1px solid hsla(45, 80%, 50%, 0.3)",
      }}>
        <button onClick={() => navigate("/")} className="p-1">
          <ArrowLeft className="h-5 w-5" style={{ color: "hsl(45 80% 65%)" }} />
        </button>
        <h1 className="font-bold text-lg" style={{ color: "hsl(45 90% 70%)" }}>👑 Admin Panel</h1>
        <button onClick={fetchStats} className="ml-auto p-2 rounded-lg" style={{ background: "hsla(45, 80%, 50%, 0.15)" }}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} style={{ color: "hsl(45 80% 65%)" }} />
        </button>
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin" style={{ color: "hsl(45 80% 65%)" }} />
        </div>
      ) : stats ? (
        <div className="px-4 space-y-4 mt-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-4" style={{
              background: "linear-gradient(135deg, hsla(200, 70%, 50%, 0.2), hsla(220, 60%, 40%, 0.2))",
              border: "1px solid hsla(200, 70%, 50%, 0.3)",
            }}>
              <Star className="h-5 w-5 mb-2" style={{ color: "hsl(45 90% 60%)" }} />
              <p className="text-2xl font-bold" style={{ color: "hsl(0 0% 95%)" }}>{stats.totalStarsEarned}</p>
              <p className="text-xs" style={{ color: "hsl(0 0% 60%)" }}>Total Stars Earned</p>
              <p className="text-xs mt-1" style={{ color: "hsl(200 70% 60%)" }}>{stats.starDepositCount} deposits</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl p-4" style={{
              background: "linear-gradient(135deg, hsla(120, 60%, 40%, 0.2), hsla(140, 50%, 35%, 0.2))",
              border: "1px solid hsla(120, 60%, 40%, 0.3)",
            }}>
              <DollarSign className="h-5 w-5 mb-2" style={{ color: "hsl(120 60% 55%)" }} />
              <p className="text-2xl font-bold" style={{ color: "hsl(0 0% 95%)" }}>${stats.totalDollarsEarned.toFixed(2)}</p>
              <p className="text-xs" style={{ color: "hsl(0 0% 60%)" }}>Total Dollars Earned</p>
              <p className="text-xs mt-1" style={{ color: "hsl(120 60% 55%)" }}>{stats.dollarDepositCount} deposits</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl p-4" style={{
              background: "linear-gradient(135deg, hsla(280, 60%, 50%, 0.2), hsla(300, 50%, 40%, 0.2))",
              border: "1px solid hsla(280, 60%, 50%, 0.3)",
            }}>
              <Users className="h-5 w-5 mb-2" style={{ color: "hsl(280 60% 65%)" }} />
              <p className="text-2xl font-bold" style={{ color: "hsl(0 0% 95%)" }}>{stats.totalUsers}</p>
              <p className="text-xs" style={{ color: "hsl(0 0% 60%)" }}>Total Users</p>
            </motion.div>

            {/* Cleanup Button */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <button
                onClick={cleanupWins}
                disabled={cleaning}
                className="w-full h-full rounded-2xl p-4 flex flex-col items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, hsla(0, 70%, 45%, 0.2), hsla(20, 60%, 40%, 0.2))",
                  border: "1px solid hsla(0, 70%, 45%, 0.3)",
                }}
              >
                <Trash2 className={`h-5 w-5 ${cleaning ? "animate-spin" : ""}`} style={{ color: "hsl(0 70% 60%)" }} />
                <p className="text-xs font-bold" style={{ color: "hsl(0 70% 60%)" }}>
                  {cleaning ? "Cleaning..." : "Cleanup Wins"}
                </p>
              </button>
            </motion.div>
          </div>

          {message && (
            <div className="rounded-xl p-3 text-sm text-center" style={{
              background: "hsla(120, 60%, 40%, 0.15)",
              color: "hsl(120 60% 65%)",
              border: "1px solid hsla(120, 60%, 40%, 0.3)",
            }}>
              {message}
            </div>
          )}

          {/* Recent Deposits */}
          <div>
            <h2 className="font-bold text-sm mb-3" style={{ color: "hsl(45 90% 70%)" }}>📋 Recent Deposits</h2>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {stats.recentTransactions.map((tx, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-xl p-3 flex items-center justify-between"
                  style={{
                    background: "hsla(260, 40%, 25%, 0.6)",
                    border: "1px solid hsla(260, 40%, 40%, 0.2)",
                  }}
                >
                  <div>
                    <p className="text-xs font-mono" style={{ color: "hsl(0 0% 60%)" }}>ID: {tx.telegramId}</p>
                    <p className="text-[10px]" style={{ color: "hsl(0 0% 45%)" }}>
                      {new Date(tx.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm" style={{
                      color: tx.currency === "star" ? "hsl(45 90% 60%)" : "hsl(120 60% 55%)",
                    }}>
                      {tx.currency === "star" ? `⭐ ${tx.amount}` : `$${tx.amount}`}
                    </p>
                  </div>
                </motion.div>
              ))}
              {stats.recentTransactions.length === 0 && (
                <p className="text-center text-sm py-4" style={{ color: "hsl(0 0% 50%)" }}>No deposits yet</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminPanel;
