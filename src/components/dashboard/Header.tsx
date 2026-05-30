"use client";

import { signOut } from "next-auth/react";
import { Search, Bell } from "lucide-react";

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

      {/* Bell with notification dot */}
      <button
        aria-label="Notificaciones"
        className="relative w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
      >
        <Bell className="w-4 h-4" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
      </button>

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
