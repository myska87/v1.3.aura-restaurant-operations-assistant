import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function ComplianceChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">No data available</p>
        </CardContent>
      </Card>
    );
  }

  const maxValue = Math.max(...data.map(d => d.compliance_rate || 0), 100);
  const latestValue = data[data.length - 1]?.compliance_rate || 0;
  const previousValue = data[data.length - 2]?.compliance_rate || 0;
  const trend = latestValue >= previousValue ? 'up' : 'down';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Compliance Trend</span>
          <div className="flex items-center gap-2 text-sm">
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span className={trend === 'up' ? 'text-green-600' : 'text-red-600'}>
              {Math.abs(latestValue - previousValue).toFixed(0)}%
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-8">{item.label}</span>
              <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    item.compliance_rate >= 95
                      ? 'bg-green-500'
                      : item.compliance_rate >= 80
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${(item.compliance_rate / maxValue) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium w-12 text-right">
                {Math.round(item.compliance_rate)}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}