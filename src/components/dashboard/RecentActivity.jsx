import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, Clock, User } from "lucide-react";
import { format } from "date-fns";

export default function RecentActivity({ activities = [] }) {
  const defaultActivities = [
    {
      id: 1,
      type: 'success',
      title: 'Temperature Check Completed',
      description: 'Walk-in fridge: 3.5°C - All clear',
      time: new Date(),
      user: 'John Smith'
    },
    {
      id: 2,
      type: 'warning',
      title: 'Maintenance Required',
      description: 'Kitchen sink - Low water pressure',
      time: new Date(Date.now() - 3600000),
      user: 'Sarah Johnson'
    },
    {
      id: 3,
      type: 'info',
      title: 'Staff Clock-in',
      description: 'Morning shift started',
      time: new Date(Date.now() - 7200000),
      user: 'Mike Davis'
    },
  ];

  const displayActivities = activities.length > 0 ? activities : defaultActivities;

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      default:
        return <Clock className="w-5 h-5 text-blue-600" />;
    }
  };

  const getBgColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50';
      case 'warning':
        return 'bg-amber-50';
      default:
        return 'bg-blue-50';
    }
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className={`p-2 rounded-lg ${getBgColor(activity.type)}`}>
                {getIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 mb-1">
                  {activity.title}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  {activity.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{activity.user}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{format(new Date(activity.time), 'h:mm a')}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}