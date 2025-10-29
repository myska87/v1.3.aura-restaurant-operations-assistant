import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-green-50 flex items-center justify-center p-6">
      <div className="text-center max-w-2xl">
        {/* 404 Animation */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-4">
            404
          </h1>
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <Search className="w-6 h-6 animate-pulse" />
            <p className="text-xl">Page Not Found</p>
          </div>
        </div>

        {/* Message */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Oops! We couldn't find that page
          </h2>
          <p className="text-gray-600 mb-6">
            The page you're looking for doesn't exist or has been moved. 
            Let's get you back to where you need to be.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={createPageUrl("Dashboard")}>
              <Button className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white shadow-lg">
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6">
          <p className="text-sm font-semibold text-gray-700 mb-3">Quick Links:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="ghost" size="sm">Dashboard</Button>
            </Link>
            <Link to={createPageUrl("MyTasks")}>
              <Button variant="ghost" size="sm">My Tasks</Button>
            </Link>
            <Link to={createPageUrl("MyShifts")}>
              <Button variant="ghost" size="sm">My Shifts</Button>
            </Link>
            <Link to={createPageUrl("ClockInOut")}>
              <Button variant="ghost" size="sm">Clock In/Out</Button>
            </Link>
            <Link to={createPageUrl("TeamChat")}>
              <Button variant="ghost" size="sm">Team Chat</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}