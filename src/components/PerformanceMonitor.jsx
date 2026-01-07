import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Zap, Clock, TrendingUp } from 'lucide-react';

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    pageLoadTime: 0,
    apiLatency: 0,
    renderTime: 0,
  });

  useEffect(() => {
    // Measure page load performance
    if (window.performance) {
      const perfData = window.performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      
      setMetrics(prev => ({
        ...prev,
        pageLoadTime: Math.round(pageLoadTime),
      }));
    }

    // Measure render time
    const renderStart = performance.now();
    requestAnimationFrame(() => {
      const renderTime = performance.now() - renderStart;
      setMetrics(prev => ({
        ...prev,
        renderTime: Math.round(renderTime),
      }));
    });
  }, []);

  const getPerformanceLevel = (time) => {
    if (time < 1000) return { label: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (time < 3000) return { label: 'Good', color: 'bg-blue-100 text-blue-800' };
    if (time < 5000) return { label: 'Fair', color: 'bg-amber-100 text-amber-800' };
    return { label: 'Slow', color: 'bg-red-100 text-red-800' };
  };

  const pagePerf = getPerformanceLevel(metrics.pageLoadTime);

  return (
    <Card className="bg-white border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-gray-600">
          <Activity className="w-4 h-4" />
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Zap className="w-4 h-4 text-gray-500" />
              <span>Page Load</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">
                {metrics.pageLoadTime}ms
              </span>
              <Badge className={pagePerf.color}>{pagePerf.label}</Badge>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>Render Time</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {metrics.renderTime}ms
            </span>
          </div>

          <div className="pt-3 border-t">
            <p className="text-xs text-gray-500">
              💡 Optimal performance: All metrics under 1000ms
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}