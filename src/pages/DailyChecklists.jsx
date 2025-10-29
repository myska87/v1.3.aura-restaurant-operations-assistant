import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DailyChecklists() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to FormIntelligence (new system)
    navigate(createPageUrl("FormIntelligence"), { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-gray-600">
        Redirecting to Form Intelligence...
      </div>
    </div>
  );
}