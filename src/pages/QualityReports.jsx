import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Download, ArrowLeft, Home, Star, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function QualityReports() {
  const { data: qualityRecords = [] } = useQuery({
    queryKey: ['allQualityRecords'],
    queryFn: () => base44.entities.QualityRecord.list('-created_date', 200),
  });

  const handleExportCSV = () => {
    const csv = [
      ['Date', 'Check Title', 'Category', 'Area', 'Score', 'Checked By', 'Comments', 'Status'].join(','),
      ...qualityRecords.map(r => [
        format(new Date(r.created_date), 'yyyy-MM-dd HH:mm'),
        r.check_title,
        r.category,
        r.area,
        r.score,
        r.checked_by_name,
        r.comments || '',
        r.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quality-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('QualityDashboard')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="w-10 h-10 text-emerald-600" />
              Quality Reports
            </h1>
            <p className="text-gray-600 mt-2">Complete quality check history</p>
          </div>
          <Button onClick={handleExportCSV} className="bg-emerald-600">
            <Download className="w-5 h-5 mr-2" />
            Export CSV
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Quality Checks</CardTitle>
          </CardHeader>
          <CardContent>
            {qualityRecords.length > 0 ? (
              <div className="space-y-3">
                {qualityRecords.map((record) => (
                  <div key={record.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{record.check_title}</h4>
                          <Badge className={
                            record.score >= 4.5 ? 'bg-green-100 text-green-800' :
                            record.score >= 4 ? 'bg-blue-100 text-blue-800' :
                            record.score >= 3 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {record.score} ⭐
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 capitalize">
                          {record.category.replace(/_/g, ' ')} • {record.area.replace(/_/g, ' ')}
                        </p>
                        {record.comments && (
                          <p className="text-sm text-gray-700 mt-2">{record.comments}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{record.checked_by_name}</span>
                          <span>•</span>
                          <span>{format(new Date(record.created_date), 'PPp')}</span>
                        </div>
                      </div>
                      {record.photo_url && (
                        <img
                          src={record.photo_url}
                          alt="Quality check"
                          className="w-20 h-20 rounded-lg object-cover ml-4"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Star className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p>No quality checks recorded yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}