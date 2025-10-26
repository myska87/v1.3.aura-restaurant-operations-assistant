import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, Search, Eye, Download, AlertTriangle, User, Database, ArrowLeft, Home, Filter } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AccessLog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterEntity, setFilterEntity] = useState("all");
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['dataAudit'],
    queryFn: () => base44.entities.DataAudit.list('-timestamp', 500),
    staleTime: 30 * 1000, // 30 seconds
  });

  const isAdmin = user?.role === 'admin' || user?.position === 'owner';

  // Redirect if not admin
  if (!isAdmin && !isLoading) {
    return (
      <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white">
            <CardContent className="p-12 text-center">
              <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-6">
                Only administrators can access audit logs
              </p>
              <Link to={createPageUrl("Dashboard")}>
                <Button>Return to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_accessed?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.record_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = filterAction === "all" || log.action_type === filterAction;
    const matchesEntity = filterEntity === "all" || log.entity_accessed === filterEntity;

    return matchesSearch && matchesAction && matchesEntity;
  });

  const getActionColor = (action) => {
    switch (action) {
      case 'read':
      case 'view':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'create':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'update':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'delete':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'export':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'read':
      case 'view':
        return <Eye className="w-3 h-3" />;
      case 'export':
        return <Download className="w-3 h-3" />;
      case 'delete':
        return <AlertTriangle className="w-3 h-3" />;
      default:
        return <Database className="w-3 h-3" />;
    }
  };

  const handleViewDetails = (log) => {
    setSelectedAudit(log);
    setShowDetailDialog(true);
  };

  const handleExportLogs = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Email', 'Entity', 'Action', 'Record ID', 'IP Address', 'Device'].join(','),
      ...filteredLogs.map(log => [
        format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        log.user_name,
        log.user_email,
        log.entity_accessed,
        log.action_type,
        log.record_id || 'N/A',
        log.ip_address || 'Unknown',
        `"${log.device_info || 'Unknown'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `access-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const uniqueEntities = [...new Set(auditLogs.map(log => log.entity_accessed))].sort();

  const stats = {
    total: auditLogs.length,
    reads: auditLogs.filter(l => l.action_type === 'read' || l.action_type === 'view').length,
    writes: auditLogs.filter(l => l.action_type === 'create' || l.action_type === 'update').length,
    deletes: auditLogs.filter(l => l.action_type === 'delete').length,
    exports: auditLogs.filter(l => l.action_type === 'export').length,
    sensitive: auditLogs.filter(l => l.is_sensitive).length,
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Back Buttons */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("DataManagement")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Data Management
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
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Shield className="w-8 h-8 text-[#014D40]" />
              Access & Audit Log
            </h1>
            <p className="text-gray-600">Complete data access tracking for GDPR compliance</p>
          </div>
          <Button onClick={handleExportLogs} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* GDPR Compliance Notice */}
        <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-900">GDPR Compliant Audit System</p>
                <p className="text-sm text-emerald-700 mt-1">
                  All data access is logged and encrypted. Logs are retained for 90 days and automatically purged thereafter.
                  This system provides full traceability of who accessed what, when, and why.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="text-center">
                <Database className="w-5 h-5 text-gray-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-600">Total Actions</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="text-center">
                <Eye className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-700">{stats.reads}</p>
                <p className="text-xs text-gray-600">Reads/Views</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="text-center">
                <Database className="w-5 h-5 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-700">{stats.writes}</p>
                <p className="text-xs text-gray-600">Creates/Updates</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="text-center">
                <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-700">{stats.deletes}</p>
                <p className="text-xs text-gray-600">Deletions</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="text-center">
                <Download className="w-5 h-5 text-purple-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-700">{stats.exports}</p>
                <p className="text-xs text-gray-600">Exports</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="text-center">
                <Shield className="w-5 h-5 text-orange-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-orange-700">{stats.sensitive}</p>
                <p className="text-xs text-gray-600">Sensitive Data</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by user, entity, or record ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="md:w-48">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="export">Export</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterEntity} onValueChange={setFilterEntity}>
                <SelectTrigger className="md:w-48">
                  <SelectValue placeholder="Filter by entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {uniqueEntities.map(entity => (
                    <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs Table */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Audit Trail
              <Badge variant="outline" className="ml-2">
                {filteredLogs.length} records
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-[#014D40] border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-500 mt-4">Loading audit logs...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-12 text-center">
                <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No audit logs found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Timestamp</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">User</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Entity</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Action</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Record ID</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">IP Address</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log, idx) => (
                      <tr key={log.id || idx} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {format(new Date(log.timestamp), 'MMM d, yyyy')}
                          <br />
                          <span className="text-xs text-gray-500">
                            {format(new Date(log.timestamp), 'h:mm:ss a')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{log.user_name}</p>
                              <p className="text-xs text-gray-500">{log.user_email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="font-mono text-xs">
                            {log.entity_accessed}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={`${getActionColor(log.action_type)} flex items-center gap-1 justify-center`}>
                            {getActionIcon(log.action_type)}
                            {log.action_type}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 font-mono">
                          {log.record_id ? log.record_id.substring(0, 8) + '...' : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 font-mono">
                          {log.ip_address || 'Unknown'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(log)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#014D40]" />
                Audit Log Details
              </DialogTitle>
            </DialogHeader>

            {selectedAudit && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Timestamp</p>
                    <p className="text-sm text-gray-900 mt-1">
                      {format(new Date(selectedAudit.timestamp), 'PPP p')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Action Type</p>
                    <Badge className={`${getActionColor(selectedAudit.action_type)} mt-1`}>
                      {selectedAudit.action_type}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">User Information</p>
                  <div className="bg-gray-50 p-3 rounded-lg mt-1">
                    <p className="text-sm font-medium text-gray-900">{selectedAudit.user_name}</p>
                    <p className="text-sm text-gray-600">{selectedAudit.user_email}</p>
                    <p className="text-xs text-gray-500 mt-1">User ID: {selectedAudit.user_id}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Data Accessed</p>
                  <div className="bg-gray-50 p-3 rounded-lg mt-1">
                    <p className="text-sm">
                      <span className="font-medium">Entity:</span> {selectedAudit.entity_accessed}
                    </p>
                    {selectedAudit.record_id && (
                      <p className="text-sm mt-1">
                        <span className="font-medium">Record ID:</span> {selectedAudit.record_id}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">IP Address</p>
                    <p className="text-sm text-gray-900 mt-1 font-mono">
                      {selectedAudit.ip_address || 'Unknown'}
                    </p>
                  </div>
                  {selectedAudit.location && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Location</p>
                      <p className="text-sm text-gray-900 mt-1">
                        {selectedAudit.location}
                      </p>
                    </div>
                  )}
                </div>

                {selectedAudit.device_info && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Device Information</p>
                    <p className="text-sm text-gray-600 mt-1 font-mono text-xs">
                      {selectedAudit.device_info}
                    </p>
                  </div>
                )}

                {selectedAudit.changes_made && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Changes Made</p>
                    <div className="bg-gray-50 p-3 rounded-lg mt-1">
                      <pre className="text-xs text-gray-700 overflow-x-auto">
                        {JSON.stringify(selectedAudit.changes_made, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {selectedAudit.access_reason && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Access Reason</p>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedAudit.access_reason}
                    </p>
                  </div>
                )}

                {selectedAudit.is_sensitive && (
                  <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <p className="text-sm font-semibold text-orange-900">Sensitive Data Access</p>
                    </div>
                    <p className="text-xs text-orange-700 mt-1">
                      This action involved access to sensitive personal data
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}