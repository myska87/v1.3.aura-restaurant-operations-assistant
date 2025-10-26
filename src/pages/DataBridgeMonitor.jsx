import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowLeft,
  Home,
  RefreshCw,
  TrendingUp,
  Zap,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DataBridgeMonitor() {
  const [filterModule, setFilterModule] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ['bridgeEvents', filterModule, filterStatus],
    queryFn: () => base44.entities.BridgeEventLog.list('-created_date'),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: moduleHealth = [] } = useQuery({
    queryKey: ['bridgeHealth'],
    queryFn: () => base44.entities.BridgeStatusMonitor.list(),
    refetchInterval: 60000, // Refresh every minute
  });

  // Access control
  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  const filteredEvents = events.filter(event => {
    const matchesModule = filterModule === 'all' || event.source_module === filterModule;
    const matchesStatus = filterStatus === 'all' || event.status === filterStatus;
    const matchesSearch = !searchTerm || 
      event.event_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.reference_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesModule && matchesStatus && matchesSearch;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getHealthStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      case 'offline':
        return 'bg-gray-400';
      default:
        return 'bg-gray-300';
    }
  };

  // Calculate stats
  const totalEvents = events.length;
  const completedEvents = events.filter(e => e.status === 'completed').length;
  const failedEvents = events.filter(e => e.status === 'failed').length;
  const pendingEvents = events.filter(e => e.status === 'pending').length;
  const successRate = totalEvents > 0 ? ((completedEvents / totalEvents) * 100).toFixed(1) : 0;

  if (!isManager) {
    return (
      <div className="p-6 md:p-8">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Access Restricted</h3>
            <p className="text-red-700">DataBridge Monitor is only accessible to managers and system administrators.</p>
            <Link to={createPageUrl("Dashboard")}>
              <Button className="mt-4">
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-10 h-10 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">DataBridge Monitor</h1>
                <p className="text-gray-600">Real-time inter-module communication status</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="outline">
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Zap className="w-8 h-8 text-blue-600" />
                <Badge className="bg-blue-100 text-blue-800">Total</Badge>
              </div>
              <p className="text-3xl font-bold text-gray-900">{totalEvents}</p>
              <p className="text-sm text-gray-600">Total Events</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <Badge className="bg-green-100 text-green-800">Success</Badge>
              </div>
              <p className="text-3xl font-bold text-gray-900">{completedEvents}</p>
              <p className="text-sm text-gray-600">Completed</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <XCircle className="w-8 h-8 text-red-600" />
                <Badge className="bg-red-100 text-red-800">Failed</Badge>
              </div>
              <p className="text-3xl font-bold text-gray-900">{failedEvents}</p>
              <p className="text-sm text-gray-600">Errors</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <Badge className="bg-purple-100 text-purple-800">Rate</Badge>
              </div>
              <p className="text-3xl font-bold text-gray-900">{successRate}%</p>
              <p className="text-sm text-gray-600">Success Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Module Health Status */}
        <Card className="bg-white border-none shadow-sm mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Module Health Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
              {moduleHealth.map(module => (
                <div 
                  key={module.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 capitalize">
                      {module.module_name}
                    </span>
                    <div className={`w-3 h-3 rounded-full ${getHealthStatusColor(module.status)}`} />
                  </div>
                  <div className="text-sm space-y-1">
                    <p className="text-gray-600">
                      Events: {module.total_events_processed || 0}
                    </p>
                    {module.avg_processing_time_ms && (
                      <p className="text-gray-600">
                        Avg: {module.avg_processing_time_ms.toFixed(0)}ms
                      </p>
                    )}
                    {module.errors_detected > 0 && (
                      <p className="text-red-600">
                        Errors: {module.errors_detected}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="bg-white border-none shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-3 gap-4">
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              
              <Select value={filterModule} onValueChange={setFilterModule}>
                <SelectTrigger>
                  <SelectValue placeholder="All Modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  <SelectItem value="tasks">Tasks</SelectItem>
                  <SelectItem value="workforce">Workforce</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="leafe">Leafe</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="documents">Documents</SelectItem>
                  <SelectItem value="checklists">Checklists</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Events List */}
        <div className="space-y-3">
          {isLoading ? (
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-gray-200 rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : filteredEvents.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="p-12 text-center">
                <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No events found</p>
              </CardContent>
            </Card>
          ) : (
            filteredEvents.map(event => (
              <Card key={event.id} className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(event.status)}
                        <h4 className="font-semibold text-gray-900">
                          {event.event_type?.replace(/_/g, ' ').toUpperCase()}
                        </h4>
                        <Badge className={getStatusColor(event.status)}>
                          {event.status}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {event.source_module}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Reference ID: {event.reference_id}</p>
                        {event.triggered_by_name && (
                          <p>Triggered by: {event.triggered_by_name}</p>
                        )}
                        <p>Created: {format(new Date(event.created_date), 'PPp')}</p>
                        {event.processed_at && (
                          <p>Processed: {format(new Date(event.processed_at), 'PPp')}</p>
                        )}
                        {event.processing_duration_ms && (
                          <p>Duration: {event.processing_duration_ms}ms</p>
                        )}
                        {event.error_message && (
                          <p className="text-red-600">Error: {event.error_message}</p>
                        )}
                      </div>
                    </div>
                    
                    {event.priority && event.priority !== 'normal' && (
                      <Badge 
                        className={
                          event.priority === 'high' || event.priority === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }
                      >
                        {event.priority}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}