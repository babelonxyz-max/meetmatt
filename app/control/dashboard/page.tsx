"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Bot,
  CreditCard,
  Database,
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
} from "lucide-react";

interface Stats {
  totalUsers: number;
  totalAgents: number;
  activeAgents: number;
  totalRevenue: number;
  pendingPayments: number;
  recentSignups: number;
}

interface Project {
  id: string;
  name: string;
  status: "active" | "maintenance" | "offline";
  url: string;
  stats: {
    users: number;
    agents: number;
    revenue: number;
  };
}

const projects: Project[] = [
  {
    id: "meetmatt",
    name: "MeetMatt",
    status: "active",
    url: "https://meetmatt.xyz",
    stats: { users: 0, agents: 0, revenue: 0 },
  },
];

export default function ControlDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchStats();
  }, []);

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
    { id: "database", label: "Database", icon: Database },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col">
        {/* Logo */}
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

        {/* Navigation */}
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

        {/* Logout */}
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
        {/* Header */}
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

        {/* Content */}
        <div className="p-8">
          {activeTab === "overview" && (
            <OverviewTab stats={stats} loading={loading} projects={projects} />
          )}
          {activeTab === "users" && <UsersTab />}
          {activeTab === "agents" && <AgentsTab />}
          {activeTab === "payments" && <PaymentsTab />}
          {activeTab === "database" && <DatabaseTab />}
          {activeTab === "settings" && <SettingsTab />}
        </div>
      </main>
    </div>
  );
}

// Overview Tab
function OverviewTab({
  stats,
  loading,
  projects,
}: {
  stats: Stats | null;
  loading: boolean;
  projects: Project[];
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-zinc-900/50 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "blue",
    },
    {
      label: "Active Agents",
      value: stats?.activeAgents || 0,
      icon: Bot,
      color: "green",
    },
    {
      label: "Total Revenue",
      value: `$${stats?.totalRevenue || 0}`,
      icon: CreditCard,
      color: "purple",
    },
    {
      label: "Pending Payments",
      value: stats?.pendingPayments || 0,
      icon: Clock,
      color: "amber",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 bg-${stat.color}-500/10 rounded-xl`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-400`} />
                </div>
              </div>
              <p className="text-3xl font-bold mb-1">{stat.value}</p>
              <p className="text-zinc-400 text-sm">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Projects */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Projects</h3>
        <div className="space-y-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h4 className="text-xl font-semibold">{project.name}</h4>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      project.status === "active"
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : "bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {project.status}
                  </span>
                </div>
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-4 bg-zinc-950 rounded-xl">
                  <p className="text-2xl font-bold">{project.stats.users}</p>
                  <p className="text-sm text-zinc-500">Users</p>
                </div>
                <div className="p-4 bg-zinc-950 rounded-xl">
                  <p className="text-2xl font-bold">{project.stats.agents}</p>
                  <p className="text-sm text-zinc-500">Agents</p>
                </div>
                <div className="p-4 bg-zinc-950 rounded-xl">
                  <p className="text-2xl font-bold">${project.stats.revenue}</p>
                  <p className="text-sm text-zinc-500">Revenue</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-500/20 transition-colors">
                  Manage
                </button>
                <button className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors">
                  View Logs
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Users Tab
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const response = await fetch("/api/control/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
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
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-950 border-b border-zinc-800">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">User</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Wallet</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Agents</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Joined</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-900/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-400">
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
                      {user.agents?.length || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Placeholder tabs
function AgentsTab() {
  return (
    <div className="text-center py-16 text-zinc-500">
      <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p>Agents management coming soon</p>
    </div>
  );
}

function PaymentsTab() {
  return (
    <div className="text-center py-16 text-zinc-500">
      <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p>Payments management coming soon</p>
    </div>
  );
}

function DatabaseTab() {
  return (
    <div className="text-center py-16 text-zinc-500">
      <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p>Database tools coming soon</p>
    </div>
  );
}

function SettingsTab() {
  return (
    <div className="text-center py-16 text-zinc-500">
      <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p>Settings panel coming soon</p>
    </div>
  );
}
