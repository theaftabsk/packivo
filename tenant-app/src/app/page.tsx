"use client";

import { useEffect } from "react";

export default function RootPage() {
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      window.location.href = "/dashboard";
    } else {
      window.location.href = "/login";
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
