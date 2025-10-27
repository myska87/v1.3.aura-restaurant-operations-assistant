
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  Home,
  Search,
  Award,
  Clock,
  CheckCircle,
  FileText,
  TrendingUp,
  Download,
  AlertTriangle
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { AuraSectionHeader, AuraStatCard } from '../components/AuraDesignSystem';

export default function SOPCertifications() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: certifications = [], isLoading } = useQuery({
    queryKey: ['sopCertifications'],
    queryFn: () => base44.entities.SOPCertification.list('-assigned_date', 200),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['allStaff'],
    queryFn: () => base44.entities.User.list(),
  });

  // Group by staff
  const staffCertMap = new Map();
  
  staff.forEach(member => {
    const memberCerts = certifications.filter(c => c.staff_email === member.email);
    const completed = memberCerts.filter(c => c.status === 'completed').length;
    const pending = memberCerts.filter(c => c.status === 'pending').length;
    const expired = memberCerts.filter(c => c.status === 'expired').length;
    const overdue = memberCerts.filter(c => c.status === 'overdue').length;
    
    staffCertMap.set(member.email, {
      ...member,
      total: memberCerts.length,
      completed,
      pending,
      expired,
      overdue,
      compliance_rate: memberCerts.length > 0 ? Math.round((completed / memberCerts.length) * 100) : 0,
      certifications: memberCerts
    });
  });

  const staffList = Array.from(staffCertMap.values()).filter(member => {
    const matchesSearch = member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || member.position === filterRole;
    
    let matchesStatus = true;
    if (filterStatus === 'compliant') {
      matchesStatus = member.compliance_rate === 100;
    } else if (filterStatus === 'pending') {
      matchesStatus = member.pending > 0;
    } else if (filterStatus === 'overdue') {
      matchesStatus = member.overdue > 0;
    }
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate overall stats
  const totalCertifications = certifications.length;
  const completedCerts = certifications.filter(c => c.status === 'completed').length;
  const pendingCerts = certifications.filter(c => c.status === 'pending').length;
  const overdueCerts = certifications.filter(c => c.status === 'overdue').length;
  const avgCompliance = staff.length > 0
    ? Math.round(staffList.reduce((sum, s) => sum + s.compliance_rate, 0) / staffList.length)
    : 0;

  const handleExportPDF = () => {
    alert('📄 PDF export feature coming soon!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Navigation */}
        <div className="flex gap-3">
          <Link to={createPageUrl("SOPDashboard")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to SOPs
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
        <AuraSectionHeader
          icon={Award}
          title="🏆 SOP Certifications"
          subtitle="Track team training and compliance"
          action={
            <Button onClick={handleExportPDF} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <AuraStatCard
            title="Total Certs"
            value={totalCertifications}
            icon={Award}
            color="teal"
            subtitle="All certifications"
          />
          <AuraStatCard
            title="Completed"
            value={completedCerts}
            icon={CheckCircle}
            color="green"
            subtitle="Signed & approved"
          />
          <AuraStatCard
            title="Pending"
            value={pendingCerts}
            icon={Clock}
            color="orange"
            subtitle="Awaiting completion"
          />
          <AuraStatCard
            title="Overdue"
            value={overdueCerts}
            icon={AlertTriangle}
            color="red"
            subtitle="Needs attention"
          />
          <AuraStatCard
            title="Avg Compliance"
            value={`${avgCompliance}%`}
            icon={TrendingUp}
            color="blue"
            subtitle="Team average"
          />
        </div>

        {/* Filters */}
        <Card className="bg-white border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search staff..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="chef">Chef</SelectItem>
                  <SelectItem value="line_cook">Line Cook</SelectItem>
                  <SelectItem value="server">Server</SelectItem>
                  <SelectItem value="bartender">Bartender</SelectItem>
                  <SelectItem value="cleaner">Cleaner</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="compliant">100% Compliant</SelectItem>
                  <SelectItem value="pending">Has Pending</SelectItem>
                  <SelectItem value="overdue">Has Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Staff List */}
        <div className="space-y-4">
          {staffList.map((member) => {
            const StatusIcon = member.compliance_rate === 100 
              ? CheckCircle 
              : member.overdue > 0 
                ? AlertTriangle 
                : Clock;
            
            const statusColor = member.compliance_rate === 100
              ? 'text-green-600'
              : member.overdue > 0
                ? 'text-red-600'
                : 'text-orange-600';

            return (
              <Card key={member.email} className="bg-white border-none shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-xl">
                        {member.full_name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{member.full_name}</h3>
                        <p className="text-gray-600">{member.email}</p>
                        <Badge className="mt-1 capitalize bg-emerald-100 text-emerald-800">
                          {member.position}
                        </Badge>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`flex items-center gap-2 mb-2 ${statusColor}`}>
                        <StatusIcon className="w-6 h-6" />
                        <span className="text-3xl font-bold">{member.compliance_rate}%</span>
                      </div>
                      <p className="text-sm text-gray-600">Compliance</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">
                        {member.completed} / {member.total} SOPs Completed
                      </span>
                      <span className="text-gray-600">
                        {member.pending} pending {member.overdue > 0 && `• ${member.overdue} overdue`}
                      </span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          member.compliance_rate === 100
                            ? 'bg-green-500'
                            : member.overdue > 0
                              ? 'bg-red-500'
                              : 'bg-orange-500'
                        }`}
                        style={{ width: `${member.compliance_rate}%` }}
                      />
                    </div>
                  </div>

                  {/* Certification List */}
                  {member.certifications.length > 0 && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                        View Certifications ({member.certifications.length})
                      </summary>
                      <div className="mt-3 space-y-2">
                        {member.certifications.map((cert) => {
                          const CertIcon = cert.status === 'completed'
                            ? CheckCircle
                            : cert.status === 'overdue'
                              ? AlertTriangle
                              : Clock;
                          
                          const certColor = cert.status === 'completed'
                            ? 'bg-green-100 text-green-800 border-green-300'
                            : cert.status === 'overdue'
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : 'bg-orange-100 text-orange-800 border-orange-300';

                          return (
                            <div key={cert.id} className={`flex items-center justify-between p-3 rounded-lg border ${certColor}`}>
                              <div className="flex items-center gap-3">
                                <CertIcon className="w-5 h-5" />
                                <div>
                                  <p className="font-medium">{cert.sop_title}</p>
                                  {cert.completed_date && (
                                    <p className="text-xs opacity-75">
                                      Signed {format(new Date(cert.completed_date), 'PPP')}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Badge variant="outline" className="capitalize">
                                {cert.status}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
