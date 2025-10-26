import React from "react";
import { Shield, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * SecureDataIndicator - Visual indicator for encrypted/sensitive fields
 * Usage: <SecureDataIndicator type="encrypted" label="Personal Data" />
 */
export default function SecureDataIndicator({ type = "encrypted", label, inline = false }) {
  const config = {
    encrypted: {
      icon: Lock,
      color: "bg-green-100 text-green-800 border-green-200",
      text: "🔒 Encrypted",
    },
    sensitive: {
      icon: Shield,
      color: "bg-amber-100 text-amber-800 border-amber-200",
      text: "⚠️ Sensitive",
    },
    pii: {
      icon: Shield,
      color: "bg-red-100 text-red-800 border-red-200",
      text: "🔐 PII",
    },
  };

  const { icon: Icon, color, text } = config[type] || config.encrypted;

  if (inline) {
    return (
      <span className="inline-flex items-center gap-1 text-xs">
        <Icon className="w-3 h-3" />
        <span>{label || text}</span>
      </span>
    );
  }

  return (
    <Badge className={`${color} border flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      <span>{label || text}</span>
    </Badge>
  );
}