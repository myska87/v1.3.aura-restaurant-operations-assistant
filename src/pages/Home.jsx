import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    // Automatically redirect to Dashboard
    navigate(createPageUrl("Dashboard"), { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
          <span className="text-white font-bold text-3xl">A</span>
        </div>
        <p className="text-gray-600">Loading AURA...</p>
      </div>
    </div>
  );
}