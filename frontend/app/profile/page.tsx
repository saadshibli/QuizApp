/**
 * Profile Settings Page — Change avatar (icon or gallery upload) and name
 */
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { authAPI } from "@/lib/api";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Check,
  Loader2,
  User,
  ImageIcon,
  Sparkles,
} from "lucide-react";
import SpaceBackground from "@/components/SpaceBackground";

const ICON_OPTIONS = [
  "🦊",
  "🐱",
  "🐶",
  "🐼",
  "🦁",
  "🐸",
  "🐵",
  "🐰",
  "🦄",
  "🐲",
  "🐯",
  "🦉",
  "🐺",
  "🦈",
  "🐙",
  "🦋",
  "🤖",
  "👾",
  "🎮",
  "🚀",
  "⚡",
  "🔥",
  "💎",
  "🌟",
  "🧑‍🚀",
  "🧙",
  "🦸",
  "🧛",
  "🎭",
  "🐻‍❄️",
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [avatarMode, setAvatarMode] = useState<"icon" | "gallery">("icon");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const currentAvatar = user?.avatar || "";
  const isUrlAvatar = currentAvatar.startsWith("http");

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      if (selectedFile) {
        formData.append("avatar", selectedFile);
      } else if (selectedIcon) {
        formData.append("avatar", selectedIcon);
      }

      const res = await authAPI.updateProfile(formData);
      const updated = res.data;

      if (user) {
        setUser({
          ...user,
          name: updated.name,
          avatar: updated.avatar || user.avatar,
        });
      }

      setSuccess(true);
      setSelectedFile(null);
      setSelectedIcon(null);
      setPreviewUrl(null);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const displayAvatar = previewUrl || (isUrlAvatar ? currentAvatar : null);
  const displayIcon =
    selectedIcon || (!isUrlAvatar && !previewUrl ? currentAvatar : null);

  return (
    <div className="space-bg min-h-screen relative overflow-hidden flex flex-col">
      <SpaceBackground />

      {/* Back button */}
      <motion.button
        type="button"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => router.back()}
        className="fixed top-6 left-6 sm:top-8 sm:left-8 z-30 text-white/70 hover:text-white transition-all flex items-center gap-2 font-bold bg-white/[0.06] px-4 py-2.5 rounded-xl backdrop-blur-md border border-white/10 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </motion.button>

      <div className="flex-1 flex items-center justify-center px-3 sm:px-4 py-10 sm:py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="rounded-[30px] p-[1px] bg-gradient-to-br from-[#8b5cf6]/58 via-[#3b82f6]/30 to-[#06b6d4]/52 shadow-[0_30px_80px_rgba(8,7,33,0.62)]">
            <div className="rounded-[29px] bg-[#140f2f]/84 backdrop-blur-[18px] p-5 sm:p-7 md:p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="h-[3px] w-28 rounded-full bg-gradient-to-r from-[#8b5cf6] via-[#6366f1] to-[#06b6d4] mb-6" />

              <h1 className="title-cartoon text-2xl text-white mb-1">
                Profile Settings
              </h1>
              <p className="text-[#a29bc7] text-sm mb-8">
                Update your name and profile picture
              </p>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-xl text-red-200 text-sm font-medium alert-cartoon-error mb-5"
                >
                  {error}
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-xl text-emerald-200 text-sm font-medium bg-emerald-500/15 border border-emerald-400/30 mb-5 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Profile updated successfully!
                </motion.div>
              )}

              {/* Avatar Section */}
              <div className="flex flex-col items-center mb-8">
                {/* Current avatar preview */}
                <div className="relative group mb-4">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white/15 overflow-hidden bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                    {displayAvatar ? (
                      <Image
                        src={displayAvatar}
                        alt="Profile"
                        width={112}
                        height={112}
                        className="w-full h-full object-cover"
                        unoptimized={!!previewUrl}
                      />
                    ) : displayIcon ? (
                      <span className="text-5xl">{displayIcon}</span>
                    ) : (
                      <User className="w-12 h-12 text-white/40" />
                    )}
                  </div>
                </div>

                {/* Mode toggle tabs */}
                <div className="flex rounded-xl overflow-hidden border border-white/15 mb-5 w-full max-w-xs">
                  <button
                    type="button"
                    onClick={() => setAvatarMode("icon")}
                    className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                      avatarMode === "icon"
                        ? "bg-purple-500/25 text-purple-200 border-r border-white/15"
                        : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08] border-r border-white/15"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Choose Icon
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarMode("gallery")}
                    className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                      avatarMode === "gallery"
                        ? "bg-cyan-500/25 text-cyan-200"
                        : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08]"
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> From Gallery
                  </button>
                </div>

                {/* Icon grid */}
                {avatarMode === "icon" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full"
                  >
                    <div className="flex flex-wrap gap-2 justify-center">
                      {ICON_OPTIONS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => {
                            setSelectedIcon(icon);
                            setSelectedFile(null);
                            setPreviewUrl(null);
                          }}
                          className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all duration-200 ${
                            selectedIcon === icon
                              ? "bg-purple-500/30 border-2 border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)] scale-110"
                              : "bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] hover:border-white/20"
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Gallery upload */}
                {avatarMode === "gallery" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full flex flex-col items-center"
                  >
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full max-w-xs py-6 rounded-xl border-2 border-dashed border-white/20 hover:border-cyan-400/50 bg-white/[0.03] hover:bg-cyan-500/5 transition-all flex flex-col items-center gap-2 cursor-pointer group"
                    >
                      <div className="w-12 h-12 rounded-full bg-cyan-500/15 flex items-center justify-center group-hover:bg-cyan-500/25 transition-colors">
                        <Camera className="w-6 h-6 text-cyan-300" />
                      </div>
                      <span className="text-sm font-semibold text-cyan-300">
                        {selectedFile ? "Change image" : "Choose from gallery"}
                      </span>
                      <span className="text-xs text-white/40">
                        JPG, PNG or GIF · Max 5 MB
                      </span>
                    </button>

                    {selectedFile && (
                      <p className="mt-3 text-xs text-emerald-300 truncate max-w-[260px]">
                        Selected: {selectedFile.name}
                      </p>
                    )}
                  </motion.div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  aria-label="Upload profile picture"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!file.type.startsWith("image/")) {
                      setError("Please select an image file.");
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      setError("Image must be under 5 MB.");
                      return;
                    }
                    setError("");
                    setSelectedFile(file);
                    setPreviewUrl(URL.createObjectURL(file));
                    setSelectedIcon(null);
                  }}
                  className="hidden"
                />
              </div>

              {/* Name Field */}
              <div className="space-y-2.5 mb-8">
                <label className="block text-white/85 font-semibold text-sm">
                  Display Name
                </label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/40 transition-colors duration-200 group-focus-within:text-cyan-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-11 sm:h-[52px] rounded-xl border border-white/12 bg-white/[0.045] pl-12 pr-4 text-white placeholder:text-white/35 outline-none transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06] focus:border-cyan-300/70 focus:bg-white/[0.07] focus:shadow-[0_0_0_4px_rgba(34,211,238,0.14),0_10px_24px_rgba(6,182,212,0.12)]"
                    placeholder="Your display name"
                  />
                </div>
              </div>

              {/* Info */}
              <div className="rounded-xl bg-white/[0.04] border border-white/8 p-4 mb-6">
                <p className="text-xs text-white/50 leading-relaxed">
                  <span className="text-white/70 font-semibold">Email:</span>{" "}
                  {user?.email}
                </p>
                <p className="text-xs text-white/50 mt-1 leading-relaxed">
                  <span className="text-white/70 font-semibold">Role:</span>{" "}
                  <span className="capitalize">{user?.role}</span>
                </p>
              </div>

              {/* Save Button */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.016, y: -1 }}
                whileTap={{ scale: 0.985 }}
                onClick={handleSave}
                disabled={saving}
                className="w-full h-11 sm:h-[52px] rounded-xl text-sm sm:text-base font-bold btn-cartoon btn-cartoon-blue inline-flex items-center justify-center gap-2 disabled:opacity-55 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
