"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Bot,
  CreditCard,
  FileText,
  Settings,
  LogOut,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  Search,
  Filter,
  ChevronRight,
  Ban,
  Trash2,
  Edit,
  Play,
  X,
  Save,
  Plus,
  Eye,
  DollarSign,
  Activity,
} from "lucide-react";

interface Stats {
  totalUsers: number;
  recentSignups: number;
  bannedUsers: number;
  totalAgents: number;
  activeAgents: number;
  pendingAgents: number;
  failedAgents: number;
  expiringSubscriptions: number;
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  pendingPayments: number;
  recentPayments: number;
  tierDistribution: { tier: string; _count: { tier: number } }[];
  statusDistribution: { status: string; _count: { status: number } }[];
}

interface User {
  id: string;
  email: string | null;
  name: string | null;
  walletAddress: string | null;
  privyId: string;
  isBanned: boolean;
  banReason: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  agents: { id: string; name: string; status: string }[];
  _count: { agents: number };
}

interface Agent {
  id: string;
  name: string;
  purpose: string;
  status: string;
  subscriptionStatus: string;
  tier: string;
  createdAt: string;
  currentPeriodEnd: string | null;
  user: {
    id: string;
    email: string | null;
    name: string | null;
  } | null;
}

interface Payment {
  id: string;
  sessionId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    email: string | null;
    name: string | null;
  } | null;
}

interface ContentItem {
  id: string;
  section: string;
  key: string;
  value: string;
  type: string;
  updatedAt: string;
}

export default function ControlDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const response = await fetch("/api/control/check");
      if (!response.ok) {
        router.push("/control/login");
        return;
      }
      fetchStats();
    } catch {
      router.push("/control/login");
    }
  }

  async function fetchStats() {
    try {
      const response = await fetch("/api/control/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = async () => {
    await fetch("/api/control/auth", { method: "DELETE" });
    router.push("/control/login");
  };

  const menuItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "users", label: "Users", icon: Users },
    { id: "agents", label: "Agents", icon: Bot },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "content", label: "Website Content", icon: FileText },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-zinc-950">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">CONTROL</h1>
              <p className="text-xs text-zinc-500">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  activeTab === item.id
                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800 px-8 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold capitalize">{activeTab}</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={fetchStats}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-full text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                System Online
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <OverviewTab key="overview" stats={stats} loading={loading} />
            )}
            {activeTab === "users" && <UsersTab key="users" />}
            {activeTab === "agents" && <AgentsTab key="agents" />}
            {activeTab === "payments" && <PaymentsTab key="payments" />}
            {activeTab === "content" && <ContentTab key="content" />}
            {activeTab === "settings" && <SettingsTab key="settings" />}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// Overview Tab
function OverviewTab({ stats, loading }: { stats: Stats | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-32 bg-zinc-900/50 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers || 0, icon: Users, color: "blue", trend: `+${stats?.recentSignups || 0} this week` },
    { label: "Active Agents", value: stats?.activeAgents || 0, icon: Bot, color: "green", trend: `${stats?.pendingAgents || 0} pending` },
    { label: "Total Revenue", value: `$${(stats?.totalRevenue || 0).toLocaleString()}`, icon: DollarSign, color: "purple", trend: `$${(stats?.monthlyRecurringRevenue || 0).toLocaleString()}/month` },
    { label: "Pending Payments", value: stats?.pendingPayments || 0, icon: Clock, color: "amber", trend: `${stats?.recentPayments || 0} this week` },
    { label: "Failed Agents", value: stats?.failedAgents || 0, icon: AlertCircle, color: "red", trend: "Needs attention" },
    { label: "Expiring Soon", value: stats?.expiringSubscriptions || 0, icon: Activity, color: "orange", trend: "Next 7 days" },
    { label: "Banned Users", value: stats?.bannedUsers || 0, icon: Ban, color: "zinc", trend: "Suspended" },
    { label: "Total Agents", value: stats?.totalAgents || 0, icon: Bot, color: "indigo", trend: `${stats?.activeAgents || 0} active` },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          const colorClasses: Record<string, string> = {
            blue: "bg-blue-500/10 text-blue-400",
            green: "bg-green-500/10 text-green-400",
            purple: "bg-purple-500/10 text-purple-400",
            amber: "bg-amber-500/10 text-amber-400",
            red: "bg-red-500/10 text-red-400",
            orange: "bg-orange-500/10 text-orange-400",
            zinc: "bg-zinc-500/10 text-zinc-400",
            indigo: "bg-indigo-500/10 text-indigo-400",
          };
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${colorClasses[stat.color]}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <p className="text-3xl font-bold mb-1">{stat.value}</p>
              <p className="text-zinc-400 text-sm">{stat.label}</p>
              <p className="text-zinc-500 text-xs mt-2">{stat.trend}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
          <h3 className="text-lg font-semibold mb-4">Tier Distribution</h3>
          <div className="space-y-3">
            {stats?.tierDistribution.map((tier) => (
              <div key={tier.tier} className="flex items-center justify-between">
                <span className="capitalize">{tier.tier} Plan</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(tier._count.tier / (stats?.totalAgents || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-zinc-400 w-8">{tier._count.tier}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
          <h3 className="text-lg font-semibold mb-4">Agent Status</h3>
          <div className="space-y-3">
            {stats?.statusDistribution.map((status) => (
              <div key={status.status} className="flex items-center justify-between">
                <span className="capitalize">{status.status}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        status.status === "active" ? "bg-green-500" :
                        status.status === "pending" ? "bg-amber-500" :
                        status.status === "error" ? "bg-red-500" :
                        "bg-blue-500"
                      }`}
                      style={{ width: `${(status._count.status / (stats?.totalAgents || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-zinc-400 w-8">{status._count.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Users Tab
function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [search, page]);

  async function fetchUsers() {
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      params.append("page", page.toString());
      
      const response = await fetch(`/api/control/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  }

  async function banUser(userId: string, isBanned: boolean) {
    try {
      const response = await fetch(`/api/control/users/${userId}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBanned, reason: "Admin action" }),
      });
      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error("Failed to ban user:", error);
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
    
    try {
      const response = await fetch(`/api/control/users/${userId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 text-white"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-950 border-b border-zinc-800">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">User</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Wallet</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Agents</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Status</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Joined</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-900/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        user.isBanned ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"
                      }`}>
                        <span className="text-sm font-medium">
                          {user.email?.[0]?.toUpperCase() || "U"}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.email || "No email"}</p>
                        <p className="text-xs text-zinc-500">{user.privyId?.slice(0, 20)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-400">
                    {user.walletAddress
                      ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
                      : "-"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-zinc-800 rounded-full text-sm">
                      {user._count?.agents || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.isBanned ? (
                      <span className="px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded-full">
                        Banned
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setSelectedUser(user); setShowDetailModal(true); }}
                        className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => banUser(user.id, !user.isBanned)}
                        className={`p-2 hover:bg-zinc-800 rounded-lg ${user.isBanned ? "text-green-400" : "text-amber-400"}`}
                        title={user.isBanned ? "Unban" : "Ban"}
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="p-2 hover:bg-zinc-800 rounded-lg text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          Page {page} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* User Detail Modal */}
      {showDetailModal && selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setShowDetailModal(false)}
          onRefresh={fetchUsers}
        />
      )}
    </div>
  );
}

// User Detail Modal
function UserDetailModal({ user, onClose, onRefresh }: { user: User; onClose: () => void; onRefresh: () => void }) {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubtab, setActiveSubtab] = useState("overview");

  useEffect(() => {
    fetchUserDetails();
  }, [user.id]);

  async function fetchUserDetails() {
    try {
      const response = await fetch(`/api/control/users/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setDetails(data);
      }
    } catch (error) {
      console.error("Failed to load user details:", error);
    } finally {
      setLoading(false);
    }
  }

  async function addNote(content: string) {
    try {
      await fetch(`/api/control/users/${user.id}/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      fetchUserDetails();
    } catch (error) {
      console.error("Failed to add note:", error);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              user.isBanned ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"
            }`}>
              <span className="text-xl font-bold">{user.email?.[0]?.toUpperCase() || "U"}</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold">{user.email || "No email"}</h3>
              <p className="text-sm text-zinc-500">{user.privyId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-2 border-b border-zinc-800">
          {["overview", "agents", "payments", "activity", "notes"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubtab(tab)}
              className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                activeSubtab === tab
                  ? "bg-blue-500/10 text-blue-400"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin text-zinc-600" />
            </div>
          ) : (
            <>
              {activeSubtab === "overview" && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-zinc-400">User Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between py-2 border-b border-zinc-800">
                        <span className="text-zinc-500">Name</span>
                        <span>{user.name || "-"}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-zinc-800">
                        <span className="text-zinc-500">Email</span>
                        <span>{user.email || "-"}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-zinc-800">
                        <span className="text-zinc-500">Wallet</span>
                        <span className="font-mono text-sm">{user.walletAddress || "-"}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-zinc-800">
                        <span className="text-zinc-500">Status</span>
                        <span className={user.isBanned ? "text-red-400" : "text-green-400"}>
                          {user.isBanned ? "Banned" : "Active"}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-zinc-800">
                        <span className="text-zinc-500">Joined</span>
                        <span>{new Date(user.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium text-zinc-400">Quick Stats</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-zinc-900 rounded-xl">
                        <p className="text-2xl font-bold">{details?.user?.agents?.length || 0}</p>
                        <p className="text-sm text-zinc-500">Agents</p>
                      </div>
                      <div className="p-4 bg-zinc-900 rounded-xl">
                        <p className="text-2xl font-bold">{details?.payments?.length || 0}</p>
                        <p className="text-sm text-zinc-500">Payments</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSubtab === "agents" && (
                <div className="space-y-4">
                  {details?.user?.agents?.map((agent: any) => (
                    <div key={agent.id} className="p-4 bg-zinc-900 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-sm text-zinc-500">{agent.status} • {agent.subscriptionStatus}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        agent.status === "active" ? "bg-green-500/10 text-green-400" :
                        agent.status === "pending" ? "bg-amber-500/10 text-amber-400" :
                        "bg-red-500/10 text-red-400"
                      }`}>
                        {agent.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {activeSubtab === "payments" && (
                <div className="space-y-4">
                  {details?.payments?.map((payment: any) => (
                    <div key={payment.id} className="p-4 bg-zinc-900 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-medium">{payment.amount} {payment.currency}</p>
                        <p className="text-sm text-zinc-500">{new Date(payment.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        payment.status === "confirmed" ? "bg-green-500/10 text-green-400" :
                        payment.status === "pending" ? "bg-amber-500/10 text-amber-400" :
                        "bg-red-500/10 text-red-400"
                      }`}>
                        {payment.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {activeSubtab === "activity" && (
                <div className="space-y-2">
                  {details?.activities?.map((activity: any) => (
                    <div key={activity.id} className="p-3 bg-zinc-900 rounded-lg flex items-center gap-3">
                      <Activity className="w-4 h-4 text-zinc-500" />
                      <div className="flex-1">
                        <p className="text-sm">{activity.action}</p>
                        <p className="text-xs text-zinc-500">{new Date(activity.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeSubtab === "notes" && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a note..."
                      className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-blue-500"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          addNote((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    {details?.user?.adminNotes?.map((note: any) => (
                      <div key={note.id} className="p-3 bg-zinc-900 rounded-lg">
                        <p className="text-sm">{note.content}</p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {new Date(note.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Agents Tab
function AgentsTab() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, [page]);

  async function fetchAgents() {
    try {
      const response = await fetch(`/api/control/agents?page=${page}`);
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error("Failed to load agents:", error);
    } finally {
      setLoading(false);
    }
  }

  async function redeployAgent(agentId: string) {
    if (!confirm("Are you sure you want to redeploy this agent?")) return;
    
    try {
      const response = await fetch(`/api/control/agents/${agentId}/redeploy`, {
        method: "POST",
      });
      if (response.ok) {
        alert("Redeployment triggered!");
        fetchAgents();
      }
    } catch (error) {
      console.error("Failed to redeploy agent:", error);
    }
  }

  async function deleteAgent(agentId: string) {
    if (!confirm("Are you sure you want to delete this agent?")) return;
    
    try {
      const response = await fetch(`/api/control/agents/${agentId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchAgents();
      }
    } catch (error) {
      console.error("Failed to delete agent:", error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-950 border-b border-zinc-800">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Agent</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Owner</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Status</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Tier</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Expires</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">Loading...</td>
              </tr>
            ) : agents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">No agents found</td>
              </tr>
            ) : (
              agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-zinc-900/50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-xs text-zinc-500 truncate max-w-xs">{agent.purpose}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-400">
                    {agent.user?.email || "Unknown"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      agent.status === "active" ? "bg-green-500/10 text-green-400" :
                      agent.status === "pending" ? "bg-amber-500/10 text-amber-400" :
                      agent.status === "error" ? "bg-red-500/10 text-red-400" :
                      "bg-zinc-500/10 text-zinc-400"
                    }`}>
                      {agent.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm capitalize">{agent.tier}</td>
                  <td className="px-6 py-4 text-sm text-zinc-400">
                    {agent.currentPeriodEnd
                      ? new Date(agent.currentPeriodEnd).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setSelectedAgent(agent); setShowEditModal(true); }}
                        className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => redeployAgent(agent.id)}
                        className="p-2 hover:bg-zinc-800 rounded-lg text-blue-400"
                        title="Redeploy"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteAgent(agent.id)}
                        className="p-2 hover:bg-zinc-800 rounded-lg text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">Page {page} of {totalPages}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedAgent && (
        <AgentEditModal
          agent={selectedAgent}
          onClose={() => setShowEditModal(false)}
          onSave={fetchAgents}
        />
      )}
    </div>
  );
}

// Agent Edit Modal
function AgentEditModal({ agent, onClose, onSave }: { agent: Agent; onClose: () => void; onSave: () => void }) {
  const [formData, setFormData] = useState({
    name: agent.name,
    purpose: agent.purpose,
    tier: agent.tier,
    status: agent.status,
    subscriptionStatus: agent.subscriptionStatus,
  });

  async function handleSave() {
    try {
      const response = await fetch(`/api/control/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        onSave();
        onClose();
      }
    } catch (error) {
      console.error("Failed to save agent:", error);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Edit Agent</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Purpose</label>
            <textarea
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Tier</label>
              <select
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="matt">Matt</option>
                <option value="pro">Pro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="error">Error</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Subscription Status</label>
            <select
              value={formData.subscriptionStatus}
              onChange={(e) => setFormData({ ...formData, subscriptionStatus: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Payments Tab
function PaymentsTab() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchPayments();
  }, [page]);

  async function fetchPayments() {
    try {
      const response = await fetch(`/api/control/payments?page=${page}`);
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error("Failed to load payments:", error);
    } finally {
      setLoading(false);
    }
  }

  async function refundPayment(paymentId: string) {
    if (!confirm("Are you sure you want to refund this payment?")) return;
    
    try {
      const response = await fetch(`/api/control/payments/${paymentId}/refund`, {
        method: "POST",
      });
      if (response.ok) {
        fetchPayments();
      }
    } catch (error) {
      console.error("Failed to refund payment:", error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-950 border-b border-zinc-800">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Payment</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">User</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Amount</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Status</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Date</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">Loading...</td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">No payments found</td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-zinc-900/50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium font-mono text-sm">{payment.sessionId.slice(0, 20)}...</p>
                      <p className="text-xs text-zinc-500">{payment.id.slice(0, 8)}...</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-400">
                    {payment.user?.email || "Unknown"}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium">{payment.amount} {payment.currency}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      payment.status === "confirmed" ? "bg-green-500/10 text-green-400" :
                      payment.status === "pending" ? "bg-amber-500/10 text-amber-400" :
                      payment.status === "refunded" ? "bg-purple-500/10 text-purple-400" :
                      "bg-red-500/10 text-red-400"
                    }`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-400">
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    {payment.status === "confirmed" && (
                      <button
                        onClick={() => refundPayment(payment.id)}
                        className="px-3 py-1 text-sm bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"
                      >
                        Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">Page {page} of {totalPages}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// Content Tab (CMS)
// Section descriptions for better organization
const sectionDescriptions: Record<string, string> = {
  global: "Global site settings and meta information",
  hero: "Homepage hero section headlines and CTAs",
  wizard: "Agent creation wizard step titles and descriptions",
  pricing: "Pricing page headlines, prices, and labels",
  pricing_features: "Pricing page feature list",
  trust_badges: "Trust badges shown on pricing page",
  metrics: "Performance metrics section",
  comparison: "Matt vs Agency comparison table",
  roi: "ROI highlight statistics",
  use_cases: "Use cases section with hours saved",
  cta: "Call-to-action section at bottom of pages",
  dashboard: "Dashboard page text",
  billing: "Billing page section titles",
  payment_modal: "Payment modal text and labels",
  footer: "Footer links and copyright",
};

function ContentTab() {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [newSection, setNewSection] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [seedInfo, setSeedInfo] = useState<{existingContentCount: number; totalSeedItems: number; canSeed: boolean} | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchContents();
    fetchSeedInfo();
  }, []);

  async function fetchContents() {
    try {
      const response = await fetch("/api/control/content");
      if (response.ok) {
        const data = await response.json();
        setContents(data.contents);
      }
    } catch (error) {
      console.error("Failed to load content:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSeedInfo() {
    try {
      const response = await fetch("/api/control/content/seed");
      if (response.ok) {
        const data = await response.json();
        setSeedInfo(data);
      }
    } catch (error) {
      console.error("Failed to load seed info:", error);
    }
  }

  async function seedContent() {
    if (!confirm("This will add all default website content. Continue?")) return;
    setSeeding(true);
    try {
      const response = await fetch("/api/control/content/seed", {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        alert(`Seeded ${data.results.created} content items!`);
        fetchContents();
        fetchSeedInfo();
      }
    } catch (error) {
      console.error("Failed to seed content:", error);
      alert("Failed to seed content");
    } finally {
      setSeeding(false);
    }
  }

  async function saveContent(section: string, key: string, value: string) {
    try {
      const response = await fetch("/api/control/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, key, value }),
      });
      if (response.ok) {
        fetchContents();
        setEditingItem(null);
      }
    } catch (error) {
      console.error("Failed to save content:", error);
    }
  }

  async function deleteContent(section: string, key: string) {
    if (!confirm("Delete this content item?")) return;
    
    try {
      await fetch(`/api/control/content?section=${section}&key=${key}`, {
        method: "DELETE",
      });
      fetchContents();
    } catch (error) {
      console.error("Failed to delete content:", error);
    }
  }

  async function addNewContent() {
    if (!newSection || !newKey) return;
    await saveContent(newSection, newKey, newValue);
    setNewSection("");
    setNewKey("");
    setNewValue("");
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Group by section
  const grouped = contents.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, ContentItem[]>);

  // Sort sections alphabetically
  const sortedSections = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      {/* Seed Button */}
      {seedInfo?.canSeed && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between">
          <div>
            <h3 className="font-medium text-blue-400">Seed Website Content</h3>
            <p className="text-sm text-zinc-400">
              {seedInfo.existingContentCount} items in database • {seedInfo.totalSeedItems} default items available
            </p>
          </div>
          <button
            onClick={seedContent}
            disabled={seeding}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
          >
            {seeding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Seed Content
          </button>
        </div>
      )}

      {/* Add New */}
      <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
        <h3 className="font-medium mb-4">Add New Content</h3>
        <div className="grid grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Section (e.g., hero)"
            value={newSection}
            onChange={(e) => setNewSection(e.target.value)}
            className="px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            placeholder="Key (e.g., title)"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:border-blue-500"
          />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Value"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="flex-1 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={addNewContent}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      {loading ? (
        <div className="text-center py-12 text-zinc-500">Loading...</div>
      ) : sortedSections.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <p>No content items yet.</p>
          <p className="text-sm mt-2">Click "Seed Content" above to add default website content.</p>
        </div>
      ) : (
        sortedSections.map((section) => {
          const items = grouped[section];
          const isExpanded = expandedSections[section] !== false; // Default expanded
          
          return (
            <div key={section} className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection(section)}
                className="w-full px-6 py-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between hover:bg-zinc-900 transition-colors"
              >
                <div className="text-left">
                  <h3 className="font-semibold capitalize">{section}</h3>
                  {sectionDescriptions[section] && (
                    <p className="text-xs text-zinc-500 mt-1">{sectionDescriptions[section]}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">{items.length} items</span>
                  <ChevronRight className={`w-5 h-5 text-zinc-500 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </div>
              </button>
              
              {isExpanded && (
                <div className="divide-y divide-zinc-800">
                  {items.map((item) => (
                    <div key={`${item.section}.${item.key}`} className="p-4 flex items-center gap-4">
                      <div className="w-32 flex-shrink-0">
                        <p className="text-sm font-medium truncate">{item.key}</p>
                        <p className="text-xs text-zinc-500">{item.type}</p>
                      </div>
                      {editingItem?.id === item.id ? (
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            defaultValue={item.value}
                            className="flex-1 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                saveContent(item.section, item.key, (e.target as HTMLInputElement).value);
                              }
                            }}
                          />
                          <button
                            onClick={() => setEditingItem(null)}
                            className="px-3 py-2 bg-zinc-800 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="flex-1 text-zinc-400 truncate" title={item.value}>{item.value}</p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => setEditingItem(item)}
                              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteContent(item.section, item.key)}
                              className="p-2 hover:bg-zinc-800 rounded-lg text-red-400"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// Settings Tab
function SettingsTab() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const response = await fetch("/api/control/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settingsMap);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function updateSetting(key: string, value: string) {
    try {
      await fetch("/api/control/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      fetchSettings();
    } catch (error) {
      console.error("Failed to update setting:", error);
    }
  }

  const settingGroups = [
    {
      title: "Pricing",
      keys: ["pricing.monthly", "pricing.annual", "pricing.annual_discount_percent"],
    },
    {
      title: "Features",
      keys: ["features.signup_enabled", "features.maintenance_mode", "features.waitlist_mode", "features.devin_integration"],
    },
    {
      title: "Website",
      keys: ["website.title", "website.description", "website.hero_title", "website.hero_subtitle", "website.cta_primary", "website.cta_secondary"],
    },
  ];

  if (loading) {
    return <div className="text-center py-12 text-zinc-500">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {settingGroups.map((group) => (
        <div key={group.title} className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 bg-zinc-950 border-b border-zinc-800">
            <h3 className="font-semibold">{group.title}</h3>
          </div>
          <div className="divide-y divide-zinc-800">
            {group.keys.map((key) => {
              const value = settings[key] || "";
              const isBoolean = value === "true" || value === "false";
              
              return (
                <div key={key} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{key.split(".").pop()}</p>
                    <p className="text-xs text-zinc-500">{key}</p>
                  </div>
                  {isBoolean ? (
                    <button
                      onClick={() => updateSetting(key, value === "true" ? "false" : "true")}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        value === "true" ? "bg-green-500" : "bg-zinc-700"
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        value === "true" ? "translate-x-7" : "translate-x-1"
                      }`} />
                    </button>
                  ) : (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => updateSetting(key, e.target.value)}
                      className="px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg w-64 focus:outline-none focus:border-blue-500"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
