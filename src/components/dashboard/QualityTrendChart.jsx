import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';

export default function QualityTrendChart({ data }) {
  if (!data || data.length === 0) {
    return null;
  }

  const maxScore = 5;
  const avgScore = data.reduce((sum, d) => sum + (d.quality_score || 0), 0) / data.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Quality Scores (7 Days)</span>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-[#E0B037] fill-[#E0B037]" />
            <span className="text-sm font-medium">{avgScore.toFixed(1)}/5</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between h-32 gap-2">
          {data.map((item, index) => {
            const height = (item.quality_score / maxScore) * 100;
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-gradient-to-t from-[#014D40] to-emerald-500 rounded-t transition-all hover:opacity-80"
                  style={{ height: `${height}%` }}
                  title={`${item.label}: ${item.quality_score}/5`}
                />
                <span className="text-[10px] text-gray-600">{item.label}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}