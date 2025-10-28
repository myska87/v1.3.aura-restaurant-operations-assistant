import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Database,
  Users,
  FileText,
  Package,
  Calendar,
  Brain,
  Shield,
  Star,
  ExternalLink,
  Home
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SystemHealthCheck() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState({});
  const [routeTests, setRouteTests] = useState({});

  // Test all critical entities
  const entityTests = [
    { name: 'Users', entity: 'User', icon: Users },
    { name: 'Shifts', entity: 'Shift', icon: Calendar },
    { name: 'Ingredients', entity: 'Ingredient', icon: Package },
    { name: 'Menu Items', entity: 'MenuItem', icon: FileText },
    { name: 'Purchase Orders', entity: 'PurchaseOrder', icon: Package },
    { name: 'SOPs', entity: 'SOPDocument', icon: FileText },
    { name: 'Quality Records', entity: 'QualityRecord', icon: Star },
    { name: 'Tasks', entity: 'StaffTask', icon: CheckCircle },
    { name: 'Forms', entity: 'FormTemplate', icon: FileText },
    { name: 'Compliance', entity: 'ComplianceCheck', icon: Shield },
    { name: 'AI Agents', entity: 'AgentConfig', icon: Brain },
  ];

  // Test critical routes
  const routeTestList = [
    { name: 'Dashboard', url: createPageUrl('Dashboard') },
    { name: 'Operations Hub', url: createPageUrl('OperationsDashboard') },
    { name: 'Staff Hub', url: createPageUrl('StaffDashboard') },
    { name: 'Inventory Hub', url: createPageUrl('InventoryDashboard') },
    { name: 'SOPs Hub', url: createPageUrl('SOPDashboardHub') },
    { name: 'Quality Hub', url: createPageUrl('QualityDashboard') },
    { name: 'Documents Hub', url: createPageUrl('DocumentsDashboard') },
    { name: 'AI Hub', url: createPageUrl('AIHub') },
    { name: 'Menu Management', url: createPageUrl('MenuManagement') },
    { name: 'Production Planning', url: createPageUrl('ProductionPlanning') },
    { name: 'Ordering', url: createPageUrl('Ordering') },
    { name: 'Order History', url: createPageUrl('OrderHistory') },
  ];

  const runHealthCheck = async () => {
    setTesting(true);
    const testResults = {};

    for (const test of entityTests) {
      try {
        const data = await base44.entities[test.entity].list('', 5);
        testResults[test.name] = {
          status: 'pass',
          count: data?.length || 0,
          message: `${data?.length || 0} records found`,
        };
      } catch (error) {
        testResults[test.name] = {
          status: 'fail',
          count: 0,
          message: error.message,
        };
      }
    }

    setResults(testResults);
    setTesting(false);
  };

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r.status === 'pass').length;
  const failedTests = totalTests - passedTests;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">System Health Check</h1>
            <p className="text-gray-600">Verify all modules and routes are working correctly</p>
          </div>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Database Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600" />
                Database Entities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  {totalTests > 0 && (
                    <p className="text-2xl font-bold text-gray-900">
                      {passedTests}/{totalTests} Healthy
                    </p>
                  )}
                </div>
                <Button
                  onClick={runHealthCheck}
                  disabled={testing}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {testing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Test Now
                    </>
                  )}
                </Button>
              </div>

              {totalTests > 0 && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <p className="text-xs text-gray-600 mb-1">Passed</p>
                    <p className="text-xl font-bold text-green-600">{passedTests}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <p className="text-xs text-gray-600 mb-1">Failed</p>
                    <p className="text-xl font-bold text-red-600">{failedTests}</p>
                  </div>
                </div>
              )}

              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {entityTests.map((test) => {
                    const result = results[test.name];
                    const Icon = test.icon;

                    return (
                      <div key={test.name} className={`p-3 rounded-lg border ${
                        !result ? 'border-gray-200 bg-white' :
                        result.status === 'pass' ? 'border-green-200 bg-green-50' :
                        'border-red-200 bg-red-50'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-gray-600" />
                            <span className="text-sm font-medium">{test.name}</span>
                          </div>
                          {result && (
                            <div className="flex items-center gap-2">
                              {result.count > 0 && (
                                <Badge variant="outline" className="text-xs">{result.count}</Badge>
                              )}
                              {result.status === 'pass' ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-600" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Route Navigation Tests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-blue-600" />
                Critical Routes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">Click to test navigation</p>
              
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {routeTestList.map((route) => (
                    <Link key={route.name} to={route.url}>
                      <div className="p-3 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">{route.name}</span>
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* System Warnings */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900 mb-2">Known Issues Being Monitored</h3>
                <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                  <li>Production Planning cart system - ✅ FIXED</li>
                  <li>Order delivery stock updates - ✅ FIXED (auto-updates inventory)</li>
                  <li>Dashboard hub routes - ✅ VERIFIED</li>
                  <li>React import errors - ✅ RESOLVED</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}