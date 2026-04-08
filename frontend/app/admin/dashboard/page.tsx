"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { adminAPI } from "@/lib/api";
import { motion } from "framer-motion";
import {
  LogOut,
  Users,
  BookOpen,
  Activity,
  Gamepad2,
  Shield,
} from "lucide-react";
import toast from "react-hot-toast";
import SpaceBackground from "@/components/SpaceBackground";

interface Stats {
  totalUsers: number;
  totalQuizzes: number;
  totalSessions: number;
  activeSessions: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

interface Quiz {
  id: number;
  title: string;
  teacher_name: string;
  question_count: number;
  created_at: string;
}

interface Session {
  id: number;
  session_code: string;
  status: string;
  quiz_title: string;
  teacher_name: string;
  participant_count: number;
  started_at: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeTab, setActiveTab] = useState<"users" | "quizzes" | "sessions">(
    "users",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (!user || user.role !== "admin") {
      router.replace("/login");
      return;
    }
    loadData();
  }, [user, isMounted, router]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, usersRes, quizzesRes, sessionsRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers(),
        adminAPI.getQuizzes(),
        adminAPI.getSessions(),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setQuizzes(quizzesRes.data);
      setSessions(sessionsRes.data);
    } catch (err: any) {
      toast.error("Failed to load admin data");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  if (!isMounted) return null;

  const statItems = [
    {
      label: "Users",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      gradient: "from-blue-500 to-cyan-500",
      shadow: "rgba(59,130,246,0.3)",
    },
    {
      label: "Quizzes",
      value: stats?.totalQuizzes ?? 0,
      icon: BookOpen,
      gradient: "from-purple-500 to-pink-500",
      shadow: "rgba(168,85,247,0.3)",
    },
    {
      label: "Sessions",
      value: stats?.totalSessions ?? 0,
      icon: Gamepad2,
      gradient: "from-amber-500 to-orange-500",
      shadow: "rgba(245,158,11,0.3)",
    },
    {
      label: "Active",
      value: stats?.activeSessions ?? 0,
      icon: Activity,
      gradient: "from-green-500 to-emerald-500",
      shadow: "rgba(34,197,94,0.3)",
    },
  ];

  const tabs = [
    { key: "users" as const, label: "Users", icon: Users, count: users.length },
    {
      key: "quizzes" as const,
      label: "Quizzes",
      icon: BookOpen,
      count: quizzes.length,
    },
    {
      key: "sessions" as const,
      label: "Sessions",
      icon: Gamepad2,
      count: sessions.length,
    },
  ];

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const statusColor = (s: string) => {
    if (s === "Active")
      return "bg-green-500/15 text-green-300 border-green-500/25";
    if (s === "Completed") return "bg-white/5 text-white/50 border-white/10";
    return "bg-amber-500/15 text-amber-300 border-amber-500/25";
  };

  const roleColor = (r: string) => {
    if (r === "admin") return "bg-red-500/15 text-red-300 border-red-500/25";
    if (r === "teacher")
      return "bg-blue-500/15 text-blue-300 border-blue-500/25";
    return "bg-purple-500/15 text-purple-300 border-purple-500/25";
  };

  return (
    <div className="space-bg min-h-screen">
      <SpaceBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Compact top bar */}
        <motion.header
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
            <div className="flex items-center gap-2 sm:gap-4">
            <div className="w-11 h-11 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/25 border border-white/15">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-black font-display tracking-tight text-white">
                Admin Panel
              </h1>
              <p className="text-[#6b6590] text-xs font-medium">
                System overview &amp; management
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="btn-cartoon btn-cartoon-outline flex items-center gap-2 py-2.5 px-3 rounded-xl"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </motion.header>

        {/* Two-column layout: sidebar + content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left sidebar — stats + navigation */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:w-56 flex-shrink-0"
          >
            <div className="lg:sticky lg:top-6 space-y-4">
              {/* Stats grid — 2x2 on mobile, stacked on lg */}
              <div className="cartoon-panel p-4">
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                  {statItems.map((stat, idx) => (
                    <div key={idx} className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center border border-white/10 flex-shrink-0`}
                        style={{ boxShadow: `0 3px 10px ${stat.shadow}` }}
                      >
                        <stat.icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div>
                        <p className="text-[#6b6590] text-[9px] font-bold uppercase tracking-wider">
                          {stat.label}
                        </p>
                        <p className="text-base font-black text-white font-display tabular-nums leading-tight">
                          {isLoading ? "\u2014" : stat.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vertical tab navigation */}
              <div className="cartoon-panel p-2 space-y-1">
                {tabs.map((tab) => (
                  <button
                    type="button"
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-sm transition-all ${
                      activeTab === tab.key
                        ? "bg-purple-500/20 text-white border border-purple-400/25"
                        : "text-[#a8a3c7] hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <tab.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left">{tab.label}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        activeTab === tab.key
                          ? "bg-purple-500/30 text-purple-200"
                          : "bg-white/5 text-[#6b6590]"
                      }`}
                    >
                      {isLoading ? "-" : tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.aside>

          {/* Main content — data table */}
          <motion.main
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex-1 min-w-0"
          >
            <div className="cartoon-panel p-0 overflow-hidden">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-10 h-10 border-[3px] border-purple-500/30 border-t-pink-500 rounded-full animate-spin" />
                  <p className="text-[#a8a3c7] text-sm font-medium">
                    Loading data...
                  </p>
                </div>
              ) : activeTab === "users" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-left">
                        <th className="px-5 py-3.5 text-[#6b6590] font-bold uppercase text-[11px] tracking-wider">
                          Name
                        </th>
                        <th className="px-5 py-3.5 text-[#6b6590] font-bold uppercase text-[11px] tracking-wider">
                          Email
                        </th>
                        <th className="px-5 py-3.5 text-[#6b6590] font-bold uppercase text-[11px] tracking-wider">
                          Role
                        </th>
                        <th className="px-5 py-3.5 text-[#6b6590] font-bold uppercase text-[11px] tracking-wider">
                          Joined
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr
                          key={u.id}
                          className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                        >
                          <td className="px-5 py-3.5 text-white font-semibold">
                            {u.name}
                          </td>
                          <td className="px-5 py-3.5 text-[#a8a3c7]">
                            {u.email}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${roleColor(u.role)}`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-[#6b6590] text-xs">
                            {formatDate(u.created_at)}
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-5 py-12 text-center text-[#6b6590]"
                          >
                            No users found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : activeTab === "quizzes" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-left">
                        <th className="px-5 py-3.5 text-[#6b6590] font-bold uppercase text-[11px] tracking-wider">
                          Title
                        </th>
                        <th className="px-5 py-3.5 text-[#6b6590] font-bold uppercase text-[11px] tracking-wider">
                          Teacher
                        </th>
                        <th className="px-5 py-3.5 text-[#6b6590] font-bold uppercase text-[11px] tracking-wider">
                          Questions
                        </th>
                        <th className="px-5 py-3.5 text-[#6b6590] font-bold uppercase text-[11px] tracking-wider">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {quizzes.map((q) => (
                        <tr
                          key={q.id}
                          className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                        >
                          <td className="px-5 py-3.5 text-white font-semibold">
                            {q.title}
                          </td>
                          <td className="px-5 py-3.5 text-[#a8a3c7]">
                            {q.teacher_name}
                          </td>
                          <td className="px-5 py-3.5 text-[#a8a3c7] font-mono">
                            {q.question_count}
                          </td>
                          <td className="px-5 py-3.5 text-[#6b6590] text-xs">
                            {formatDate(q.created_at)}
                          </td>
                        </tr>
                      ))}
                      {quizzes.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-5 py-12 text-center text-[#6b6590]"
                          >
                            No quizzes found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-left">
                        <th className="px-5 py-3.5 text-[#6b6590] font-bold uppercase text-[11px] tracking-wider">
                          Code
                        </th>
                        <th className="px-5 py-3.5 text-[#6b6590] font-bold uppercase text-[11px] tracking-wider">
                          Quiz
                        </th>
                        <th className="px-5 py-3.5 text-[#6b6590] font-bold uppercase text-[11px] tracking-wider">
                          Teacher
                        </th>
                        <th className="px-5 py-3.5 text-[#6b6590] font-bold uppercase text-[11px] tracking-wider">
                          Players
                        </th>
                        <th className="px-5 py-3.5 text-[#6b6590] font-bold uppercase text-[11px] tracking-wider">
                          Status
                        </th>
                        <th className="px-5 py-3.5 text-[#6b6590] font-bold uppercase text-[11px] tracking-wider">
                          Started
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s) => (
                        <tr
                          key={s.id}
                          className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                        >
                          <td className="px-5 py-3.5 text-cyan-300 font-mono font-bold">
                            {s.session_code}
                          </td>
                          <td className="px-5 py-3.5 text-white font-semibold">
                            {s.quiz_title}
                          </td>
                          <td className="px-5 py-3.5 text-[#a8a3c7]">
                            {s.teacher_name}
                          </td>
                          <td className="px-5 py-3.5 text-[#a8a3c7] font-mono">
                            {s.participant_count}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusColor(s.status)}`}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-[#6b6590] text-xs">
                            {formatDate(s.started_at)}
                          </td>
                        </tr>
                      ))}
                      {sessions.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-5 py-12 text-center text-[#6b6590]"
                          >
                            No sessions found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.main>
        </div>
      </div>
    </div>
  );
}
