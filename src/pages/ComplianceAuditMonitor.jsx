import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  FileText,
  Search,
  Filter,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';

export default function ComplianceAuditMonitor() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [filterAction, setFilterAction] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['complianceAudits'],
    queryFn: () => base44.entities.ComplianceAudit.list('-created_date', 200),
  });

  const { data: securityIncidents = [] } = useQuery({
    queryKey: ['securityIncidents'],
    queryFn: () => base44.entities.ComplianceSecurityIncident.filter({ status: { $in: ['open', 'investigating'] } }),
  });

  const isOwner = user?.role === 'admin' || user?.position === 'owner';

  if (!isOwner) {
    return (
      <div className="p-8 text-center">
        <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Access restricted to owners and administrators</p>
      </div>
    );
  }

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.action_description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesModule = filterModule === 'all' || log.module_name === filterModule;
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    return matchesSearch && matchesModule && matchesAction;
  });

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getActionColor = (action) => {
    if (action === 'delete') return 'bg-red-100 text-red-800';
    if (action === 'update') return 'bg-amber-100 text-amber-800';
    if (action === 'create') return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const criticalLogs = filteredLogs.filter(log => log.severity === 'critical');
  const todayLogs = filteredLogs.filter(log => 
    new Date(log.created_date).toDateString() === new Date().toDateString()
  );

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600 mb-1">Security Incidents</p>
                <p className="text-3xl font-bold text-red-600">{securityIncidents.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600 mb-1">Critical Actions</p>
                <p className="text-3xl font-bold text-amber-600">{criticalLogs.length}</p>
              </div>
              <Shield className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600 mb-1">Actions Today</p>
                <p className="text-3xl font-bold text-blue-600">{todayLogs.length}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[250px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search audit logs..."
                className="pl-10"
              />
            </div>

            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">All Modules</option>
              <option value="staff">Staff</option>
              <option value="inventory">Inventory</option>
              <option value="orders">Orders</option>
              <option value="payroll">Payroll</option>
              <option value="documents">Documents</option>
              <option value="menu">Menu</option>
              <option value="compliance">Compliance</option>
            </select>

            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">All Actions</option>
              <option value="view">View</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="export">Export</option>
              <option value="download">Download</option>
            </select>

            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Trail ({filteredLogs.length} records)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-500">Loading audit logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No audit logs found</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getSeverityColor(log.severity)}>
                        {log.severity}
                      </Badge>
                      <Badge className={getActionColor(log.action)}>
                        {log.action}
                      </Badge>
                      <Badge variant="outline">
                        {log.module_name}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {log.action_description || `${log.action} on ${log.target_entity}`}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {log.user_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(log.created_date), 'PPp')}
                      </span>
                      {log.ip_address && (
                        <span>IP: {log.ip_address}</span>
                      )}
                    </div>
                    {log.is_sensitive && (
                      <Badge className="mt-2 bg-purple-100 text-purple-800 text-xs">
                        Sensitive Data Access
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}