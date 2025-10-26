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
import { Mail, Search, Calendar, User, CheckCircle, XCircle, Clock, Eye, ArrowLeft, Home } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function EmailLog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const { data: emailLogs = [], isLoading } = useQuery({
    queryKey: ['emailLogs'],
    queryFn: () => base44.entities.EmailLog.list('-sent_at', 500),
    staleTime: 1 * 60 * 1000,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-order_date', 200),
    staleTime: 2 * 60 * 1000,
  });

  const filteredLogs = emailLogs.filter(log => {
    const matchesSearch = 
      log.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.recipient_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || log.status === filterStatus;
    const matchesType = filterType === "all" || log.email_type === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'bounced':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'bounced':
        return <XCircle className="w-4 h-4 text-orange-600" />;
      default:
        return <Mail className="w-4 h-4 text-gray-600" />;
    }
  };

  const handleViewDetails = (log) => {
    setSelectedEmail(log);
    setShowDetailDialog(true);
  };

  const getRelatedOrder = (orderId) => {
    return orders.find(o => o.id === orderId);
  };

  const stats = {
    total: emailLogs.length,
    sent: emailLogs.filter(l => l.status === 'sent').length,
    failed: emailLogs.filter(l => l.status === 'failed').length,
    pending: emailLogs.filter(l => l.status === 'pending').length,
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Back Buttons */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("Ordering")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
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
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Email Communication Log</h1>
              <p className="text-gray-600">Track all sent emails and delivery status</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Emails</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Mail className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Successfully Sent</p>
                  <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white mb-6">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search emails..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="bounced">Bounced</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
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
            </div>
          </CardContent>
        </Card>

        {/* Email List */}
        <div className="space-y-3">
          {isLoading ? (
            <Card className="bg-white">
              <CardContent className="p-12 text-center">
                <div className="animate-pulse">
                  <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Loading email logs...</p>
                </div>
              </CardContent>
            </Card>
          ) : filteredLogs.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="p-12 text-center">
                <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No emails found</p>
                <p className="text-sm text-gray-400">
                  {searchTerm || filterStatus !== "all" || filterType !== "all"
                    ? "Try adjusting your filters"
                    : "Start sending emails from the Ordering page"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredLogs.map((log) => {
              const relatedOrder = log.related_order_id ? getRelatedOrder(log.related_order_id) : null;

              return (
                <Card key={log.id} className="bg-white hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="mt-1">
                          {getStatusIcon(log.status)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-1">
                                {log.subject}
                              </h3>
                              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  To: {log.recipient_name || log.recipient_email}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(log.sent_at), 'PPP p')}
                                </span>
                                {log.sender_name && (
                                  <>
                                    <span>•</span>
                                    <span>By {log.sender_name}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(log.status)}>
                                {log.status}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {log.email_type.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                          </div>

                          {relatedOrder && (
                            <div className="text-xs text-gray-500 mb-2">
                              📦 Related Order: {relatedOrder.order_number} - £{relatedOrder.total?.toFixed(2)}
                            </div>
                          )}

                          {log.error_message && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700 mt-2">
                              ⚠️ Error: {log.error_message}
                            </div>
                          )}

                          {log.delivery_confirmed_at && (
                            <div className="text-xs text-green-600 mt-2">
                              ✓ Delivered on {format(new Date(log.delivery_confirmed_at), 'PPP p')}
                            </div>
                          )}

                          {log.retry_count > 0 && (
                            <div className="text-xs text-yellow-600 mt-2">
                              🔄 Retry attempts: {log.retry_count}
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(log)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Email Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                Email Details
              </DialogTitle>
            </DialogHeader>

            {selectedEmail && (
              <div className="space-y-6 mt-4">
                {/* Email Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Status</Label>
                    <div className="mt-1">
                      <Badge className={getStatusColor(selectedEmail.status)}>
                        {selectedEmail.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Type</Label>
                    <div className="mt-1">
                      <Badge variant="outline">
                        {selectedEmail.email_type.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">To</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedEmail.recipient_name} ({selectedEmail.recipient_email})
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">From</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedEmail.sender_name} ({selectedEmail.sender_email})
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Sent At</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {format(new Date(selectedEmail.sent_at), 'PPP p')}
                    </p>
                  </div>
                  {selectedEmail.delivery_confirmed_at && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Delivered At</Label>
                      <p className="text-sm text-gray-900 mt-1">
                        {format(new Date(selectedEmail.delivery_confirmed_at), 'PPP p')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Subject */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Subject</Label>
                  <p className="text-sm text-gray-900 mt-1 font-semibold">
                    {selectedEmail.subject}
                  </p>
                </div>

                {/* Error Message */}
                {selectedEmail.error_message && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <Label className="text-sm font-medium text-red-900">Error Message</Label>
                    <p className="text-sm text-red-700 mt-1">
                      {selectedEmail.error_message}
                    </p>
                  </div>
                )}

                {/* Email Body Preview */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Email Body Preview
                  </Label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <div dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }} />
                  </div>
                </div>

                {/* Related Order */}
                {selectedEmail.related_order_id && (() => {
                  const order = getRelatedOrder(selectedEmail.related_order_id);
                  return order ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <Label className="text-sm font-medium text-blue-900 mb-2 block">
                        Related Purchase Order
                      </Label>
                      <div className="space-y-1 text-sm text-blue-800">
                        <p><strong>Order Number:</strong> {order.order_number}</p>
                        <p><strong>Supplier:</strong> {order.supplier_name}</p>
                        <p><strong>Total:</strong> £{order.total?.toFixed(2)}</p>
                        <p><strong>Status:</strong> {order.status}</p>
                      </div>
                      <Link to={createPageUrl('OrderHistory')}>
                        <Button variant="outline" size="sm" className="mt-3">
                          View Order →
                        </Button>
                      </Link>
                    </div>
                  ) : null;
                })()}

                {/* Metadata */}
                {selectedEmail.metadata && Object.keys(selectedEmail.metadata).length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Additional Metadata
                    </Label>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <pre className="text-xs text-gray-700 overflow-x-auto">
                        {JSON.stringify(selectedEmail.metadata, null, 2)}
                      </pre>
                    </div>
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