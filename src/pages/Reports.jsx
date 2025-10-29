
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
import { Download, TrendingUp, Calendar } from "lucide-react";
import { format, subDays } from "date-fns";

// Safe number formatting
const safeNumber = (value, decimals = 2) => {
  const num = parseFloat(value);
  return isNaN(num) || num === null || num === undefined ? 0 : parseFloat(num.toFixed(decimals));
};

export default function Reports() {
  const [timeRange, setTimeRange] = useState("7days");

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

  // Calculate date range
  const getDaysToShow = () => {
    switch (timeRange) {
      case '7days': return 7;
      case '30days': return 30;
      case '90days': return 90;
      default: return 7;
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
      rate: safeNumber(passRate, 0),
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
