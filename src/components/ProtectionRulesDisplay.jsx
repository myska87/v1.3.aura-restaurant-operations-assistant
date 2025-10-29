/**
 * 📋 PROTECTION RULES DISPLAY
 * Visual reference of all protection rules and guidelines
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Code, Database, FileText } from "lucide-react";

export default function ProtectionRulesDisplay() {
  const allowedOperations = [
    {
      operation: "Create New Pages",
      description: "Build new pages in isolated module folders",
      example: "/modules/NewFeatureCore/pages/FeaturePage.jsx",
      icon: FileText,
    },
    {
      operation: "Create New Modules",
      description: "Create standalone modules with 'Core' suffix",
      example: "AURA_AnalyticsCore, AURA_ReportingCore",
      icon: Code,
    },
    {
      operation: "Create New Components",
      description: "Build reusable UI components in module scope",
      example: "/modules/NewFeatureCore/components/Widget.jsx",
      icon: Code,
    },
    {
      operation: "Add New Entities",
      description: "Create new database tables with module namespace",
      example: "AnalyticsMetric, ReportingSnapshot",
      icon: Database,
    },
    {
      operation: "API Connections",
      description: "Read data from existing modules via API",
      example: "const users = await base44.entities.User.list()",
      icon: Code,
    },
    {
      operation: "Metadata References",
      description: "Store IDs and references, never duplicate data",
      example: "{ target_module: 'User', target_id: userId }",
      icon: Database,
    },
  ];

  const forbiddenOperations = [
    {
      operation: "Edit Existing Pages",
      description: "Modify JSX, routes, or logic in protected pages",
      example: "pages/Dashboard.jsx, pages/Inventory.jsx",
      icon: FileText,
    },
    {
      operation: "Modify Existing Entities",
      description: "Change schema of protected database tables",
      example: "User, Shift, MenuItem, PurchaseOrder",
      icon: Database,
    },
    {
      operation: "Edit Existing Components",
      description: "Modify protected reusable components",
      example: "NotificationBell, WelcomeNewHire, SmartAlerts",
      icon: Code,
    },
    {
      operation: "Rename Entities",
      description: "Change names of existing database tables",
      example: "User → StaffMember (❌ FORBIDDEN)",
      icon: Database,
    },
    {
      operation: "Modify Global Styles",
      description: "Change layout, theme, or global CSS",
      example: "layout.jsx, globals.css",
      icon: FileText,
    },
    {
      operation: "Direct Data Writes",
      description: "Update/delete records in protected entities",
      example: "base44.entities.User.update() (❌ BLOCKED)",
      icon: Database,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Allowed Operations */}
      <Card className="border-2 border-green-300">
        <CardHeader className="bg-green-50">
          <CardTitle className="flex items-center gap-2 text-green-900">
            <CheckCircle className="w-6 h-6" />
            ✅ Allowed Operations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-4">
            {allowedOperations.map((op, index) => {
              const Icon = op.icon;
              return (
                <div key={index} className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Icon className="w-5 h-5 text-green-700" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-900 mb-1">{op.operation}</h4>
                    <p className="text-sm text-green-800 mb-2">{op.description}</p>
                    <code className="text-xs bg-white px-2 py-1 rounded border border-green-300 text-green-700 block">
                      {op.example}
                    </code>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Forbidden Operations */}
      <Card className="border-2 border-red-300">
        <CardHeader className="bg-red-50">
          <CardTitle className="flex items-center gap-2 text-red-900">
            <XCircle className="w-6 h-6" />
            ❌ Forbidden Operations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-4">
            {forbiddenOperations.map((op, index) => {
              const Icon = op.icon;
              return (
                <div key={index} className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Icon className="w-5 h-5 text-red-700" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-900 mb-1">{op.operation}</h4>
                    <p className="text-sm text-red-800 mb-2">{op.description}</p>
                    <code className="text-xs bg-white px-2 py-1 rounded border border-red-300 text-red-700 block">
                      {op.example}
                    </code>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}