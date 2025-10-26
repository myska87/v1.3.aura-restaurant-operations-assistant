import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

export default function LogoGenerator({ onLogoGenerated }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    generateLogo();
  }, []);

  const generateLogo = async () => {
    // Check if logo already exists in localStorage
    const existingLogo = localStorage.getItem('aura_logo_url');
    if (existingLogo) {
      onLogoGenerated?.(existingLogo);
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await base44.integrations.Core.GenerateImage({
        prompt: `Professional restaurant management system logo for "AURA". Modern, minimalist design. 
        Emerald green (#014D40) and gold accents. 
        Clean geometric shapes suggesting efficiency and organization.
        Restaurant/hospitality themed. 
        Premium, trustworthy feel.
        Text "AURA" integrated elegantly.
        White/transparent background.
        High quality, vector-style, suitable for business software.`
      });

      if (response?.url) {
        localStorage.setItem('aura_logo_url', response.url);
        onLogoGenerated?.(response.url);
      }
    } catch (err) {
      console.error('Error generating logo:', err);
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (generating) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#014D40]" />
        <span className="text-sm text-gray-600">Generating logo...</span>
      </div>
    );
  }

  if (error) {
    return null; // Fail silently and use fallback
  }

  return null;
}