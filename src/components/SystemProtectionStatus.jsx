import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, CheckCircle, AlertTriangle, Database, Code, Boxes } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * 🔒 SYSTEM PROTECTION STATUS
 * Visual confirmation of protected modules
 * Shows what's locked and what can be safely extended
 */
export default function SystemProtectionStatus() {
  const protectedModules = [
    {
      name: "AURA_Main",
      status: "locked",
      components: ["Dashboard", "Layout", "Navigation"],
      entities: 0,
      pages: 45,
      lastModified: "2024-01-15",
    },
    {
      name: "AURA_ComplianceCore",
      status: "locked",
      components: ["EventListener", "EmailLogger", "DataConnector"],
      entities: 5,
      pages: 3,
      lastModified: "2024-01-15",
    },
    {
      name: "AURA_WorkforceCore",
      status: "locked",
      components: ["StaffModel", "Shifts", "Attendance", "Payroll"],
      entities: 15,
      pages: 12,
      lastModified: "2024-01-14",
    },
    {
      name: "Inventory",
      status: "locked",
      components: ["Stock", "Orders", "Suppliers", "Production"],
      entities: 8,
      pages: 8,
      lastModified: "2024-01-13",
    },
    {
      name: "Menu",
      status: "locked",
      components: ["MenuManagement", "Categories", "Analysis", "Allergens"],
      entities: 4,
      pages: 5,
      lastModified: "2024-01-13",
    },
    {
      name: "FormBuilder",
      status: "locked",
      components: ["DynamicForms", "Templates", "Responses"],
      entities: 3,
      pages: 3,
      lastModified: "2024-01-12",
    },
    {
      name: "DocumentManagement",
      status: "locked",
      components: ["Documents", "Versions", "Reviews"],
      entities: 4,
      pages: 2,
      lastModified: "2024-01-12",
    },
    {
      name: "Notifications",
      status: "locked",
      components: ["NotificationBell", "TaskAlerts", "SmartAlerts"],
      entities: 2,
      pages: 1,
      lastModified: "2024-01-11",
    },
  ];

  const extensionRules = [
    {
      rule: "New Module Creation",
      description: "Create isolated folders with own namespace",
      status: "required",
      icon: Boxes,
    },
    {
      rule: "API-Only Integration",
      description: "Connect via REST endpoints, not direct imports",
      status: "required",
      icon: Code,
    },
    {
      rule: "Metadata References",
      description: "Store IDs only, never duplicate data",
      status: "required",
      icon: Database,
    },
    {
      rule: "Event Listeners",
      description: "Use passive monitoring, no direct hooks",
      status: "recommended",
      icon: Shield,
    },
  ];

  const totalPages = protectedModules.reduce((sum, m) => sum + m.pages, 0);
  const totalEntities = protectedModules.reduce((sum, m) => sum + m.entities, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Card className="border-2 border-emerald-500 shadow-xl mb-6">
        <CardHeader className="bg-gradient-to-r from-emerald-600 to-green-600 text-white">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8" />
            <div>
              <CardTitle className="text-2xl">🔒 PROTECTION MODE ACTIVE</CardTitle>
              <p className="text-sm text-emerald-100 mt-1">
                All existing modules are locked. Safe extension mode enabled.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-5 h-5 text-blue-600" />
                <p className="font-semibold text-blue-900">Protected Modules</p>
              </div>
              <p className="text-3xl font-bold text-blue-600">{protectedModules.length}</p>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Code className="w-5 h-5 text-purple-600" />
                <p className="font-semibold text-purple-900">Protected Pages</p>
              </div>
              <p className="text-3xl font-bold text-purple-600">{totalPages}</p>
            </div>
            
            <div className="bg-amber-50 rounded-lg p-4 border-2 border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-5 h-5 text-amber-600" />
                <p className="font-semibold text-amber-900">Protected Entities</p>
              </div>
              <p className="text-3xl font-bold text-amber-600">{totalEntities}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Protected Modules List */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-gray-700" />
            Protected Modules (Read-Only)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {protectedModules.map((module) => (
              <div
                key={module.name}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{module.name}</h3>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {module.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                    <span>📄 {module.pages} pages</span>
                    <span>•</span>
                    <span>🗄️ {module.entities} entities</span>
                    <span>•</span>
                    <span>Last modified: {module.lastModified}</span>
                  </div>
                </div>
                <Shield className="w-6 h-6 text-green-600" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Extension Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-blue-600" />
            Safe Extension Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {extensionRules.map((rule, index) => {
              const Icon = rule.icon;
              return (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200"
                >
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">{rule.rule}</h4>
                    <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                    <Badge className={
                      rule.status === 'required' 
                        ? 'bg-red-100 text-red-800 border-red-200' 
                        : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                    }>
                      {rule.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Warning Banner */}
      <div className="mt-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900 mb-1">⚠️ Protection Mode Active</h3>
            <p className="text-sm text-amber-800">
              Any attempt to modify protected modules will be blocked. 
              All new features must be created in isolated modules with proper API connections.
              <strong> Existing functionality is preserved and cannot be overwritten.</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}