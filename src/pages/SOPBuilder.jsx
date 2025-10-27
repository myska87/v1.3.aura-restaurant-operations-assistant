import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import SOPAIGenerator from '../components/SOPAIGenerator';

export default function SOPBuilder() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex gap-3">
          <Link to={createPageUrl("SOPDashboard")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to SOPs
            </Button>
          </Link>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <Card className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white border-none shadow-2xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold flex items-center gap-3">
              ✨ SOP Builder
            </CardTitle>
            <p className="text-white/90 text-lg">
              Create professional Standard Operating Procedures instantly with AI assistance
            </p>
          </CardHeader>
        </Card>

        {/* AI Generator */}
        <SOPAIGenerator />
      </div>
    </div>
  );
}