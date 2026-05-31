"use client";

import { signOut } from "next-auth/react";
import { Search } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface HeaderProps {
  clinicName: string;
  userName:   string;
  plan:       string;
}

export function Header({ userName }: HeaderProps) {
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="h-14 bg-white/80 backdrop-blur-sm border-b border-gray-100 flex items-center justify-end px-6 sticky top-0 z-30 gap-3">
      {/* Search */}
      <button
        aria-label="Buscar"
        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
      >
        <Search className="w-4 h-4" />
      </button>

      <NotificationBell />

      {/* Avatar — click to sign out */}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        aria-label="Cerrar sesión"
        className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-semibold hover:bg-indigo-600 transition-colors"
        title="Cerrar sesión"
      >
        {initials}
      </button>
    </header>
  );
}
