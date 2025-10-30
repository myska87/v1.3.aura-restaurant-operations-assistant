import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  TrendingUp,
  Award,
  AlertTriangle,
  Download,
  Search,
  Filter,
  ArrowLeft,
  Home,
  CheckCircle,
  Clock,
  Star,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import AccessGuard from '../components/AccessGuard';

export default function ManagerTrainingDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterPosition, setFilterPosition] = useState('all');

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: trainingModules = [] } = useQuery({
    queryKey: ['trainingModules'],
    queryFn: () => base44.entities.TrainingModule.list(),
  });

  const { data: allProgress = [] } = useQuery({
    queryKey: ['allTrainingProgress'],
    queryFn: () => base44.entities.TrainingRecord.list('-created_date'),
  });

  const { data: allCertificates = [] } = useQuery({
    queryKey: ['allCertificates'],
    queryFn: () => base44.entities.Certificate.list('-issued_date'),
  });

  const handleExportCSV = () => {
    let csv = 'Staff Name,Email,Position,Department,Total Modules,Completed,In Progress,Progress %,Certificates,Last Activity\n';
    
    staffWithProgress.forEach(staff => {
      csv += `"${staff.name}","${staff.email}","${staff.position || 'N/A'}","${staff.department || 'N/A'}",${staff.totalModules},${staff.completed},${staff.inProgress},${staff.progressPercent}%,${staff.certificates},${staff.lastActivity || 'Never'}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-progress-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Training Progress Report</title>
          <style>
            body { font-family: Arial; padding: 40px; }
            h1 { color: #014D40; border-bottom: 3px solid #10B981; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #014D40; color: white; padding: 12px; text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
            tr:nth-child(even) { background: #f8fafc; }
            .progress-bar { height: 20px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
            .progress-fill { height: 100%; background: #10B981; }
            .footer { margin-top: 30px; text-align: center; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>🎓 Training Progress Report</h1>
          <p><strong>Generated:</strong> ${format(new Date(), 'PPP')}</p>
          <p><strong>Total Staff:</strong> ${staffWithProgress.length} | <strong>Avg Progress:</strong> ${avgProgress.toFixed(1)}%</p>
          
          <table>
            <thead>
              <tr>
                <th>Staff Name</th>
                <th>Position</th>
                <th>Department</th>
                <th>Progress</th>
                <th>Completed</th>
                <th>Certificates</th>
              </tr>
            </thead>
            <tbody>
              ${staffWithProgress.map(staff => `
                <tr>
                  <td><strong>${staff.name}</strong></td>
                  <td>${staff.position || 'N/A'}</td>
                  <td>${staff.department || 'N/A'}</td>
                  <td>
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${staff.progressPercent}%"></div>
                    </div>
                    ${staff.progressPercent}%
                  </td>
                  <td>${staff.completed} / ${staff.totalModules}</td>
                  <td>${staff.certificates} 🏆</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>AURA Restaurant Operations - Training Academy</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const staffWithProgress = allUsers
    .filter(u => u.status === 'active' || !u.status)
    .map(user => {
      const userProgress = allProgress.filter(p => p.staff_email === user.email);
      const userCerts = allCertificates.filter(c => c.staff_email === user.email);
      const completed = userProgress.filter(p => p.status === 'completed').length;
      const inProgress = userProgress.filter(p => p.status === 'in_progress').length;
      const lastActivity = userProgress.length > 0 
        ? format(new Date(Math.max(...userProgress.map(p => new Date(p.created_date)))), 'MMM d, yyyy')
        : null;

      return {
        email: user.email,
        name: user.full_name,
        position: user.position,
        department: user.department,
        totalModules: trainingModules.length,
        completed,
        inProgress,
        progressPercent: trainingModules.length > 0 ? Math.round((completed / trainingModules.length) * 100) : 0,
        certificates: userCerts.length,
        lastActivity,
      };
    })
    .filter(staff => {
      const matchSearch = !searchTerm || 
        staff.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = filterDepartment === 'all' || staff.department === filterDepartment;
      const matchPos = filterPosition === 'all' || staff.position === filterPosition;
      return matchSearch && matchDept && matchPos;
    })
    .sort((a, b) => b.progressPercent - a.progressPercent);

  const avgProgress = staffWithProgress.length > 0
    ? staffWithProgress.reduce((sum, s) => sum + s.progressPercent, 0) / staffWithProgress.length
    : 0;

  const needsAttention = staffWithProgress.filter(s => s.progressPercent < 30).length;
  const excellent = staffWithProgress.filter(s => s.progressPercent >= 80).length;

  return (
    <AccessGuard allowedRoles={['admin']} allowedPositions={['manager', 'owner']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          
          <div className="flex gap-3 mb-6">
            <Link to={createPageUrl('TrainingAcademy')}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Training Academy
              </Button>
            </Link>
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="outline" size="sm">
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>

          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Training Progress Dashboard</h1>
              <p className="text-gray-600">Monitor team learning and development</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={handleExportPDF} className="bg-emerald-600 hover:bg-emerald-700">
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Staff</p>
                    <p className="text-3xl font-bold text-blue-600">{staffWithProgress.length}</p>
                  </div>
                  <Users className="w-10 h-10 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Progress</p>
                    <p className="text-3xl font-bold text-green-600">{avgProgress.toFixed(0)}%</p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Excellent (80%+)</p>
                    <p className="text-3xl font-bold text-purple-600">{excellent}</p>
                  </div>
                  <Star className="w-10 h-10 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Needs Support</p>
                    <p className="text-3xl font-bold text-orange-600">{needsAttention}</p>
                  </div>
                  <AlertTriangle className="w-10 h-10 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-600" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search staff..."
                    className="pl-10"
                  />
                </div>

                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="kitchen">Kitchen</SelectItem>
                    <SelectItem value="front_of_house">Front of House</SelectItem>
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="management">Management</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterPosition} onValueChange={setFilterPosition}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Positions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    <SelectItem value="chef">Chef</SelectItem>
                    <SelectItem value="server">Server</SelectItem>
                    <SelectItem value="bartender">Bartender</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterDepartment('all');
                    setFilterPosition('all');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Training Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {staffWithProgress.map((staff, idx) => (
                  <Card key={staff.email} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                          {staff.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-gray-900">{staff.name}</h3>
                              <div className="flex gap-2 mt-1">
                                {staff.position && (
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {staff.position.replace('_', ' ')}
                                  </Badge>
                                )}
                                {staff.department && (
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {staff.department.replace('_', ' ')}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-purple-600">{staff.progressPercent}%</div>
                              <div className="text-xs text-gray-500">
                                {staff.completed}/{staff.totalModules} modules
                              </div>
                            </div>
                          </div>

                          <Progress value={staff.progressPercent} className="h-2 mb-3" />

                          <div className="flex items-center justify-between text-sm">
                            <div className="flex gap-4">
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                {staff.completed} completed
                              </div>
                              <div className="flex items-center gap-1 text-blue-600">
                                <Clock className="w-4 h-4" />
                                {staff.inProgress} in progress
                              </div>
                              <div className="flex items-center gap-1 text-amber-600">
                                <Award className="w-4 h-4" />
                                {staff.certificates} certificates
                              </div>
                            </div>
                            {staff.lastActivity && (
                              <span className="text-gray-500 text-xs">
                                Last activity: {staff.lastActivity}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {staffWithProgress.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No staff found matching your filters</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AccessGuard>
  );
}