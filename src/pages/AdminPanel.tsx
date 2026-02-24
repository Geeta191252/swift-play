import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Star, DollarSign, RefreshCw, User, CreditCard } from "lucide-react";
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
  }>;
}

interface UserData {
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  dollarBalance: number;
  starBalance: number;
  dollarWinning: number;
  starWinning: number;
  createdAt: string;
}

interface WithdrawalRequest {
  telegramId: number;
  currency: string;
  amount: number;
  status: string;
  createdAt: string;
  description?: string;
}

type Tab = "stats" | "users" | "withdrawals";

const AdminPanel = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("stats");

  const user = getTelegramUser();
  const isOwner = user?.id === OWNER_ID;

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/stats`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ownerId: String(OWNER_ID) }),
        }),
        fetch(`${API_BASE_URL}/admin/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ownerId: String(OWNER_ID) }),
        }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
        setWithdrawals(data.withdrawals || []);
      }
    } catch (e) {
      console.error("Failed to fetch admin data", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOwner) fetchAll();
  }, []);

  if (!isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(260 60% 15%)" }}>
        <p style={{ color: "hsl(0 70% 60%)" }} className="text-lg font-bold">⛔ Access Denied</p>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "stats", label: "Stats", icon: <Star className="h-4 w-4" /> },
    { key: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
    { key: "withdrawals", label: "Withdrawals", icon: <CreditCard className="h-4 w-4" /> },
  ];

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
        <button onClick={fetchAll} className="ml-auto p-2 rounded-lg" style={{ background: "hsla(45, 80%, 50%, 0.15)" }}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} style={{ color: "hsl(45 80% 65%)" }} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 mt-3">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all"
            style={{
              background: activeTab === tab.key ? "hsla(45, 80%, 50%, 0.25)" : "hsla(260, 40%, 30%, 0.4)",
              color: activeTab === tab.key ? "hsl(45 90% 70%)" : "hsl(0 0% 55%)",
              border: activeTab === tab.key ? "1px solid hsla(45, 80%, 50%, 0.4)" : "1px solid transparent",
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin" style={{ color: "hsl(45 80% 65%)" }} />
        </div>
      ) : (
        <div className="px-4 mt-4">
          {/* Stats Tab */}
          {activeTab === "stats" && stats && (
            <div className="space-y-4">
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
              </div>

              {/* Recent Deposits */}
              <div>
                <h2 className="font-bold text-sm mb-3" style={{ color: "hsl(45 90% 70%)" }}>📋 Recent Deposits</h2>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {stats.recentTransactions.map((tx, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                      className="rounded-xl p-3 flex items-center justify-between"
                      style={{ background: "hsla(260, 40%, 25%, 0.6)", border: "1px solid hsla(260, 40%, 40%, 0.2)" }}>
                      <div>
                        <p className="text-xs font-mono" style={{ color: "hsl(0 0% 60%)" }}>ID: {tx.telegramId}</p>
                        <p className="text-[10px]" style={{ color: "hsl(0 0% 45%)" }}>{new Date(tx.createdAt).toLocaleString()}</p>
                      </div>
                      <p className="font-bold text-sm" style={{ color: tx.currency === "star" ? "hsl(45 90% 60%)" : "hsl(120 60% 55%)" }}>
                        {tx.currency === "star" ? `⭐ ${tx.amount}` : `$${tx.amount}`}
                      </p>
                    </motion.div>
                  ))}
                  {stats.recentTransactions.length === 0 && (
                    <p className="text-center text-sm py-4" style={{ color: "hsl(0 0% 50%)" }}>No deposits yet</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <div className="space-y-2">
              <p className="text-xs mb-2" style={{ color: "hsl(0 0% 50%)" }}>{users.length} total users</p>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {users.map((u, i) => (
                  <motion.div key={u.telegramId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="rounded-xl p-3" style={{ background: "hsla(260, 40%, 25%, 0.6)", border: "1px solid hsla(260, 40%, 40%, 0.2)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4" style={{ color: "hsl(45 80% 65%)" }} />
                      <span className="text-xs font-bold" style={{ color: "hsl(0 0% 90%)" }}>
                        {u.firstName || u.username || "Unknown"}
                        {u.lastName ? ` ${u.lastName}` : ""}
                      </span>
                      {u.username && (
                        <span className="text-[10px]" style={{ color: "hsl(200 70% 60%)" }}>@{u.username}</span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono mb-2" style={{ color: "hsl(0 0% 50%)" }}>ID: {u.telegramId}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg p-2" style={{ background: "hsla(45, 80%, 50%, 0.1)" }}>
                        <p className="text-[10px]" style={{ color: "hsl(0 0% 50%)" }}>⭐ Star Wallet</p>
                        <p className="text-sm font-bold" style={{ color: "hsl(45 90% 60%)" }}>
                          {(u.starBalance || 0) + (u.starWinning || 0)}
                        </p>
                      </div>
                      <div className="rounded-lg p-2" style={{ background: "hsla(120, 60%, 40%, 0.1)" }}>
                        <p className="text-[10px]" style={{ color: "hsl(0 0% 50%)" }}>$ Dollar Wallet</p>
                        <p className="text-sm font-bold" style={{ color: "hsl(120 60% 55%)" }}>
                          ${((u.dollarBalance || 0) + (u.dollarWinning || 0)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {users.length === 0 && (
                  <p className="text-center text-sm py-8" style={{ color: "hsl(0 0% 50%)" }}>No users yet</p>
                )}
              </div>
            </div>
          )}

          {/* Withdrawals Tab */}
          {activeTab === "withdrawals" && (
            <div className="space-y-2">
              <p className="text-xs mb-2" style={{ color: "hsl(0 0% 50%)" }}>{withdrawals.length} pending requests</p>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {withdrawals.map((w, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="rounded-xl p-3" style={{ background: "hsla(260, 40%, 25%, 0.6)", border: "1px solid hsla(0, 70%, 45%, 0.3)" }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono" style={{ color: "hsl(0 0% 60%)" }}>ID: {w.telegramId}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{
                        background: "hsla(45, 80%, 50%, 0.2)",
                        color: "hsl(45 80% 65%)",
                      }}>{w.status}</span>
                    </div>
                    <p className="font-bold text-sm" style={{
                      color: w.currency === "star" ? "hsl(45 90% 60%)" : "hsl(120 60% 55%)",
                    }}>
                      {w.currency === "star" ? `⭐ ${Math.abs(w.amount)}` : `$${Math.abs(w.amount).toFixed(2)}`}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: "hsl(0 0% 45%)" }}>
                      {new Date(w.createdAt).toLocaleString()}
                    </p>
                    {w.description && <p className="text-[10px]" style={{ color: "hsl(0 0% 40%)" }}>{w.description}</p>}
                  </motion.div>
                ))}
                {withdrawals.length === 0 && (
                  <p className="text-center text-sm py-8" style={{ color: "hsl(0 0% 50%)" }}>No withdrawal requests</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;