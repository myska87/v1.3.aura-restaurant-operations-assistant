import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ComplianceChart({ data = [] }) {
  const chartData = data.length > 0 ? data : [
    { name: 'Mon', passed: 8, failed: 2 },
    { name: 'Tue', passed: 9, failed: 1 },
    { name: 'Wed', passed: 10, failed: 0 },
    { name: 'Thu', passed: 7, failed: 3 },
    { name: 'Fri', passed: 9, failed: 1 },
  ];

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Weekly Compliance Checks
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="passed" fill="#10b981" radius={[8, 8, 0, 0]} />
            <Bar dataKey="failed" fill="#ef4444" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}