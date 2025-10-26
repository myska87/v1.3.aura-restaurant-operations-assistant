import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Shield, Key, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { checkKeyRotation, getEncryptionKey } from "./encryption";

/**
 * Encryption Key Manager - Admin Component
 * Displays encryption status and allows manual key rotation
 */
export default function EncryptionKeyManager() {
  const [keyStatus, setKeyStatus] = useState(null);
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    updateKeyStatus();
  }, []);

  const updateKeyStatus = () => {
    const status = checkKeyRotation();
    setKeyStatus(status);
  };

  const handleManualRotation = () => {
    if (!confirm('⚠️ Rotating encryption key will require re-encryption of existing data. Continue?')) {
      return;
    }

    setRotating(true);
    
    // Force key rotation
    localStorage.removeItem('aura_encryption_key');
    getEncryptionKey(); // This will generate a new key
    
    setTimeout(() => {
      updateKeyStatus();
      setRotating(false);
      alert('✅ Encryption key rotated successfully. Please update encrypted data.');
    }, 1000);
  };

  if (!keyStatus) return null;

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Encryption Key Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Encryption Status</p>
            <p className="text-xs text-gray-500">AES-256-GCM encryption active</p>
          </div>
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Days Until Rotation</p>
            <p className="text-xs text-gray-500">Keys rotate every 90 days</p>
          </div>
          <Badge 
            className={
              keyStatus.daysUntilRotation < 7 
                ? "bg-red-100 text-red-800 border-red-200" 
                : "bg-blue-100 text-blue-800 border-blue-200"
            }
          >
            {keyStatus.daysUntilRotation} days
          </Badge>
        </div>

        {keyStatus.needsRotation && (
          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">
              🔴 Encryption key has expired! Please rotate immediately.
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleManualRotation}
          disabled={rotating}
          variant="outline"
          className="w-full"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${rotating ? 'animate-spin' : ''}`} />
          {rotating ? 'Rotating Key...' : 'Rotate Key Manually'}
        </Button>

        <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
          <p>🔐 Last Rotation: {new Date(keyStatus.lastRotation).toLocaleDateString()}</p>
          <p>🔑 Algorithm: AES-256-GCM</p>
          <p>📦 Storage: Client-side (Upgrade to server-side for production)</p>
        </div>
      </CardContent>
    </Card>
  );
}