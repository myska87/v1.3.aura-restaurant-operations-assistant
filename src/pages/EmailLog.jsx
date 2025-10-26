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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, Send, CheckCircle, XCircle, Clock, Search, Filter, Eye, ArrowLeft, Home, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function EmailLog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: emailLogs = [], isLoading } = useQuery({
    queryKey: ['emailLogs'],
    queryFn: () => base44.entities.EmailLog.list('-sent_at'),
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'bounced': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      case 'bounced': return <XCircle className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'purchase_order': return 'bg-blue-100 text-blue-800';
      case 'supplier_request': return 'bg-purple-100 text-purple-800';
      case 'notification': return 'bg-indigo-100 text-indigo-800';
      case 'alert': return 'bg-red-100 text-red-800';
      case 'confirmation': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredEmails = emailLogs.filter(email => {
    const matchesSearch = 
      email.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.recipient_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.recipient_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || email.email_type === filterType;
    const matchesStatus = filterStatus === 'all' || email.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = {
    total: emailLogs.length,
    sent: emailLogs.filter(e => e.status === 'sent').length,
    failed: emailLogs.filter(e => e.status === 'failed').length,
    pending: emailLogs.filter(e => e.status === 'pending').length,
  };

  const handleViewEmail = (email) => {
    setSelectedEmail(email);
    setShowPreview(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Buttons */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("Ordering")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
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
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl">
              <Mail className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Email Log
              </h1>
              <p className="text-gray-600 mt-1">Track all automated emails sent from AURA</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Mail className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
              <p className="text-sm text-gray-600">Total Emails</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.sent}</p>
              <p className="text-sm text-gray-600">Successfully Sent</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pending}</p>
              <p className="text-sm text-gray-600">Pending</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.failed}</p>
              <p className="text-sm text-gray-600">Failed</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by subject, recipient..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Email Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="purchase_order">Purchase Orders</SelectItem>
                  <SelectItem value="supplier_request">Supplier Requests</SelectItem>
                  <SelectItem value="notification">Notifications</SelectItem>
                  <SelectItem value="alert">Alerts</SelectItem>
                  <SelectItem value="confirmation">Confirmations</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="bounced">Bounced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Email List */}
        <Card>
          <CardHeader>
            <CardTitle>Email History ({filteredEmails.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-gray-500">Loading emails...</p>
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No emails found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEmails.map(email => (
                  <div
                    key={email.id}
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getTypeColor(email.email_type)}>
                            {email.email_type.replace('_', ' ')}
                          </Badge>
                          <Badge className={getStatusColor(email.status)}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(email.status)}
                              {email.status}
                            </span>
                          </Badge>
                        </div>
                        
                        <h3 className="font-semibold text-gray-900 mb-1">{email.subject}</h3>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>To:</strong> {email.recipient_name} ({email.recipient_email})</p>
                          <p><strong>From:</strong> {email.sender_name} ({email.sender_email})</p>
                          <p className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(email.sent_at), 'PPP p')}
                          </p>
                        </div>

                        {email.error_message && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            <strong>Error:</strong> {email.error_message}
                          </div>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewEmail(email)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Email Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-gray-500">To</Label>
                  <p className="font-medium">{selectedEmail.recipient_name} ({selectedEmail.recipient_email})</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">From</Label>
                  <p className="font-medium">{selectedEmail.sender_name} ({selectedEmail.sender_email})</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Subject</Label>
                  <p className="font-medium">{selectedEmail.subject}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Sent At</Label>
                  <p className="font-medium">{format(new Date(selectedEmail.sent_at), 'PPP p')}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-xs text-gray-500 mb-2 block">Email Content</Label>
                <div 
                  className="border rounded-lg p-4 bg-white"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}