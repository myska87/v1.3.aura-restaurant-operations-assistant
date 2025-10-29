import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Package, Users, BookOpen, Star, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const hubCards = [
  { title: 'Operations', icon: Target, url: createPageUrl('OperationsDashboard'), color: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  { title: 'Inventory', icon: Package, url: createPageUrl('InventoryDashboard'), color: 'bg-blue-50', iconColor: 'text-blue-600' },
  { title: 'Staff', icon: Users, url: createPageUrl('StaffDashboard'), color: 'bg-purple-50', iconColor: 'text-purple-600' },
  { title: 'SOPs', icon: BookOpen, url: createPageUrl('SOPsDashboard'), color: 'bg-indigo-50', iconColor: 'text-indigo-600' },
  { title: 'Quality', icon: Star, url: createPageUrl('QualityDashboardHub'), color: 'bg-amber-50', iconColor: 'text-amber-600' },
  { title: 'Documents', icon: FileText, url: createPageUrl('DocumentsDashboard'), color: 'bg-gray-50', iconColor: 'text-gray-600' },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome! 👋</h1>
        <p className="text-lg text-gray-600 mb-8">Your restaurant operations command center</p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hubCards.map((hub) => {
            const Icon = hub.icon;
            return (
              <Link key={hub.title} to={hub.url}>
                <Card className="bg-white hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-6">
                    <div className={`p-4 ${hub.color} rounded-xl mb-4 inline-block`}>
                      <Icon className={`w-8 h-8 ${hub.iconColor}`} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{hub.title}</h3>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}