import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export default function TaskCompletionChart({ data }) {
  if (!data || data.length === 0) {
    return null;
  }

  const maxTasks = Math.max(...data.map(d => d.tasks_completed || 0), 10);
  const totalCompleted = data.reduce((sum, d) => sum + (d.tasks_completed || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Tasks Completed</span>
          <div className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium">{totalCompleted} this week</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between h-32 gap-1">
          {data.map((item, index) => {
            const height = maxTasks > 0 ? (item.tasks_completed / maxTasks) * 100 : 0;
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all hover:shadow-lg"
                  style={{ height: `${height}%` }}
                  title={`${item.label}: ${item.tasks_completed} tasks`}
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