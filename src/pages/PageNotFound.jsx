import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PageNotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full bg-white shadow-xl border-none">
        <CardContent className="p-12 text-center">
          {/* 404 Illustration */}
          <div className="mb-8">
            <div className="text-9xl font-bold text-gray-200 mb-4">404</div>
            <div className="relative -mt-16">
              <Search className="w-16 h-16 text-gray-400 mx-auto" />
            </div>
          </div>

          {/* Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Page Not Found
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
            <Link to={createPageUrl("Dashboard")}>
              <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
                <Home className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          {/* Quick Links */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-4">Quick Links:</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link to={createPageUrl("Dashboard")}>
                <Button variant="link" className="text-blue-600">
                  Dashboard
                </Button>
              </Link>
              <Link to={createPageUrl("Inventory")}>
                <Button variant="link" className="text-blue-600">
                  Inventory
                </Button>
              </Link>
              <Link to={createPageUrl("StaffRota")}>
                <Button variant="link" className="text-blue-600">
                  Staff & Rota
                </Button>
              </Link>
              <Link to={createPageUrl("Compliance")}>
                <Button variant="link" className="text-blue-600">
                  Compliance
                </Button>
              </Link>
              <Link to={createPageUrl("Reports")}>
                <Button variant="link" className="text-blue-600">
                  Reports
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}