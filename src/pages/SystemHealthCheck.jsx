import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  TrendingUp
} from 'lucide-react';

export default function SystemHealthCheck() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState({});

  // Test all critical entities
  const tests = [
    { name: 'Users', entity: 'User', icon: Users },
    { name: 'Shifts', entity: 'Shift', icon: Calendar },
    { name: 'Ingredients', entity: 'Ingredient', icon: Package },
    { name: 'Menu Items', entity: 'MenuItem', icon: FileText },
    { name: 'SOPs', entity: 'SOPDocument', icon: FileText },
    { name: 'Quality Records', entity: 'QualityRecord', icon: Star },
    { name: 'Tasks', entity: 'StaffTask', icon: CheckCircle },
    { name: 'Forms', entity: 'FormTemplate', icon: FileText },
    { name: 'Compliance', entity: 'ComplianceCheck', icon: Shield },
    { name: 'AI Agents', entity: 'AgentConfig', icon: Brain },
  ];

  const runHealthCheck = async () => {
    setTesting(true);
    const testResults = {};

    for (const test of tests) {
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
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">System Health Check</h1>
          <p className="text-gray-600">Verify all modules are working correctly</p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600">System Status</p>
                {totalTests > 0 && (
                  <p className="text-2xl font-bold text-gray-900">
                    {passedTests}/{totalTests} Tests Passed
                  </p>
                )}
              </div>
              <Button
                onClick={runHealthCheck}
                disabled={testing}
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
                    Run Health Check
                  </>
                )}
              </Button>
            </div>

            {totalTests > 0 && (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-sm text-gray-600 mb-1">Passed</p>
                  <p className="text-2xl font-bold text-green-600">{passedTests}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <p className="text-sm text-gray-600 mb-1">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{failedTests}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-gray-600 mb-1">Success Rate</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          {tests.map((test) => {
            const result = results[test.name];
            const Icon = test.icon;

            return (
              <Card key={test.name} className={
                !result ? 'border-gray-200' :
                result.status === 'pass' ? 'border-green-200 bg-green-50/50' :
                'border-red-200 bg-red-50/50'
              }>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">{test.name}</p>
                      {result && (
                        <p className="text-sm text-gray-600">{result.message}</p>
                      )}
                    </div>
                  </div>
                  
                  {result && (
                    <div className="flex items-center gap-2">
                      {result.count > 0 && (
                        <Badge variant="outline">{result.count} records</Badge>
                      )}
                      {result.status === 'pass' ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-600" />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}