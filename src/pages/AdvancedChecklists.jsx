import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AdvancedChecklists() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Page Deprecated</h2>
            <p className="text-gray-700 mb-6">
              Advanced Checklists have been replaced by <strong>Form Intelligence</strong> - a more powerful and flexible system for managing all your compliance forms.
            </p>
            <div className="flex gap-3 justify-center">
              <Link to={createPageUrl("FormIntelligence")}>
                <Button className="bg-[#014D40] hover:bg-[#013830]">
                  Go to Form Intelligence
                </Button>
              </Link>
              <Link to={createPageUrl("Dashboard")}>
                <Button variant="outline">
                  <Home className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}