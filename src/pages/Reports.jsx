import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, TrendingUp, Calendar, Mail, Package, FileText } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

export default function Reports() {
  const [timeRange, setTimeRange] = useState("30days");

  const { data: complianceChecks = [] } = useQuery({
    queryKey: ['complianceChecks'],
    queryFn: () => base44.entities.ComplianceCheck.list("-check_date", 100),
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventoryItems'],
    queryFn: () => base44.entities.InventoryItem.list(),
  });

  const { data: maintenanceTickets = [] } = useQuery({
    queryKey: ['maintenanceTickets'],
    queryFn: () => base44.entities.MaintenanceTicket.list(),
  });

  const { data: staffTasks = [] } = useQuery({
    queryKey: ['staffTasks'],
    queryFn: () => base44.entities.StaffTask.list(),
  });

  const { data: emailLogs = [] } = useQuery({
    queryKey: ['emailLogs'],
    queryFn: () => base44.entities.EmailLog.list('-sent_at', 500),
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-order_date', 200),
  });

  // Calculate date range
  const getDaysToShow = () => {
    switch (timeRange) {
      case '7days': return 7;
      case '30days': return 30;
      case '90days': return 90;
      default: return 30;
    }
  };

  const days = getDaysToShow();
  const dateRange = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    return date;
  });

  // Compliance trend data
  const complianceTrendData = dateRange.map(date => {
    const dayChecks = complianceChecks.filter(check => {
      const checkDate = new Date(check.check_date);
      return checkDate.toDateString() === date.toDateString();
    });

    const passRate = dayChecks.length > 0
      ? (dayChecks.filter(c => c.status === "passed").length / dayChecks.length) * 100
      : 0;

    return {
      date: format(date, 'MMM d'),
      rate: Math.round(passRate),
    };
  });

  // Category distribution
  const categoryData = inventoryItems.reduce((acc, item) => {
    const cat = item.category.replace(/_/g, ' ');
    const existing = acc.find(c => c.name === cat);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: cat, value: 1 });
    }
    return acc;
  }, []);

  // Maintenance status
  const maintenanceData = [
    { name: 'Open', value: maintenanceTickets.filter(t => t.status === 'open').length },
    { name: 'In Progress', value: maintenanceTickets.filter(t => t.status === 'in_progress').length },
    { name: 'Completed', value: maintenanceTickets.filter(t => t.status === 'completed').length },
  ];

  // Task completion rate
  const taskCompletionData = dateRange.map(date => {
    const dayTasks = staffTasks.filter(task => {
      const taskDate = new Date(task.due_date);
      return taskDate.toDateString() === date.toDateString();
    });

    return {
      date: format(date, 'MMM d'),
      completed: dayTasks.filter(t => t.status === 'completed').length,
      pending: dayTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
    };
  });

  // Email Communications Report (NEW)
  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const monthlyEmailLogs = emailLogs.filter(log => {
    const logDate = new Date(log.sent_at);
    return logDate >= monthStart && logDate <= monthEnd;
  });

  const emailStats = {
    total: monthlyEmailLogs.length,
    sent: monthlyEmailLogs.filter(e => e.status === 'sent').length,
    failed: monthlyEmailLogs.filter(e => e.status === 'failed').length,
    purchaseOrders: monthlyEmailLogs.filter(e => e.email_type === 'purchase_order').length,
  };

  // Supplier Communication Summary (NEW)
  const supplierCommunications = monthlyEmailLogs
    .filter(log => log.email_type === 'purchase_order')
    .reduce((acc, log) => {
      const supplier = log.recipient_name || log.recipient_email;
      if (!acc[supplier]) {
        acc[supplier] = {
          name: supplier,
          email: log.recipient_email,
          emailsSent: 0,
          ordersPlaced: 0,
          lastContact: log.sent_at,
        };
      }
      acc[supplier].emailsSent += 1;
      acc[supplier].ordersPlaced += 1;
      if (new Date(log.sent_at) > new Date(acc[supplier].lastContact)) {
        acc[supplier].lastContact = log.sent_at;
      }
      return acc;
    }, {});

  const supplierCommArray = Object.values(supplierCommunications);

  // Purchase Order Trends (NEW)
  const orderTrendData = dateRange.map(date => {
    const dayOrders = purchaseOrders.filter(order => {
      const orderDate = new Date(order.order_date);
      return orderDate.toDateString() === date.toDateString();
    });

    const dayTotal = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    return {
      date: format(date, 'MMM d'),
      orders: dayOrders.length,
      value: Math.round(dayTotal),
    };
  });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const exportToCSV = () => {
    const csvData = [
      ['AURA Restaurant Report', `Generated: ${format(new Date(), 'PPP')}`],
      [''],
      ['Compliance Summary'],
      ['Total Checks', complianceChecks.length],
      ['Pass Rate', `${Math.round((complianceChecks.filter(c => c.status === 'passed').length / complianceChecks.length) * 100)}%`],
      [''],
      ['Inventory Summary'],
      ['Total Items', inventoryItems.length],
      ['Low Stock Items', inventoryItems.filter(i => i.current_quantity <= (i.minimum_quantity || 0)).length],
      [''],
      ['Maintenance Summary'],
      ['Total Tickets', maintenanceTickets.length],
      ['Open Tickets', maintenanceTickets.filter(t => t.status === 'open').length],
      [''],
      ['Staff Tasks Summary'],
      ['Total Tasks', staffTasks.length],
      ['Completed', staffTasks.filter(t => t.status === 'completed').length],
      [''],
      ['Email Communications (This Month)'],
      ['Total Emails Sent', emailStats.total],
      ['Successfully Delivered', emailStats.sent],
      ['Failed', emailStats.failed],
      ['Purchase Orders Sent', emailStats.purchaseOrders],
      [''],
      ['Supplier Communications'],
      ['Supplier', 'Email', 'Emails Sent', 'Orders Placed', 'Last Contact'],
      ...supplierCommArray.map(s => [
        s.name,
        s.email,
        s.emailsSent,
        s.ordersPlaced,
        format(new Date(s.lastContact), 'PPP p'),
      ]),
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aura-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
            <p className="text-gray-600">Data-driven insights for better decisions</p>
          </div>
          <div className="flex gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Email Communications Summary - NEW */}
          <Card className="bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                Email Communications - {format(currentMonth, 'MMMM yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Total Emails</p>
                  <p className="text-3xl font-bold text-blue-900">{emailStats.total}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Successfully Sent</p>
                  <p className="text-3xl font-bold text-green-900">{emailStats.sent}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">Failed</p>
                  <p className="text-3xl font-bold text-red-900">{emailStats.failed}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Purchase Orders</p>
                  <p className="text-3xl font-bold text-purple-900">{emailStats.purchaseOrders}</p>
                </div>
              </div>

              {/* Supplier Communications Table */}
              {supplierCommArray.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Supplier Communications Summary
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Supplier</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Emails Sent</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Orders Placed</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Last Contact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplierCommArray.map((supplier, idx) => (
                          <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm font-medium text-gray-900">{supplier.name}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{supplier.email}</td>
                            <td className="py-3 px-4 text-sm text-center font-semibold text-blue-600">{supplier.emailsSent}</td>
                            <td className="py-3 px-4 text-sm text-center font-semibold text-green-600">{supplier.ordersPlaced}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {format(new Date(supplier.lastContact), 'MMM d, yyyy p')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Purchase Order Trends - NEW */}
          <Card className="bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Purchase Order Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={orderTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="orders" fill="#8b5cf6" name="Number of Orders" radius={[8, 8, 0, 0]} />
                  <Bar yAxisId="right" dataKey="value" fill="#10b981" name="Order Value (£)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Compliance Trend */}
          <Card className="bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Compliance Pass Rate Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={complianceTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }} 
                  />
                  <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Inventory Distribution */}
            <Card className="bg-white border-none shadow-sm">
              <CardHeader>
                <CardTitle>Inventory by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Maintenance Status */}
            <Card className="bg-white border-none shadow-sm">
              <CardHeader>
                <CardTitle>Maintenance Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={maintenanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }} 
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Task Completion */}
          <Card className="bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle>Task Completion Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={taskCompletionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="completed" fill="#10b981" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="pending" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}