
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Search,
  Plus,
  Eye,
  Clock,
  Users,
  CheckCircle,
  PlayCircle,
  Edit,
  TrendingUp,
  Award,
  Filter,
  BookOpen,
  Mic,
  AlertTriangle
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function SOPDashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  const { data: sops = [] } = useQuery({
    queryKey: ['sops'],
    queryFn: () => base44.entities.SOPDocument.list('-created_date', 100),
  });

  const { data: myCertifications = [] } = useQuery({
    queryKey: ['myCertifications', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.SOPCertification.filter({
        staff_email: user.email
      });
    },
    enabled: !!user?.email,
  });

  const { data: signatures = [] } = useQuery({
    queryKey: ['sopSignatures', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.SOPSignatureLog.filter({
        staff_email: user.email
      });
    },
    enabled: !!user?.email,
  });

  // Filter SOPs
  const activeSops = sops.filter(sop => sop.active_status);
  
  const filteredSops = activeSops.filter(sop => {
    const matchesSearch = !searchQuery || 
      sop.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sop.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || sop.category === selectedCategory;
    
    const matchesRole = !user?.position || 
      !sop.role_assigned || 
      sop.role_assigned.length === 0 ||
      sop.role_assigned.includes('all') ||
      sop.role_assigned.includes(user.position);
    
    return matchesSearch && matchesCategory && matchesRole;
  });

  // Calculate stats
  const myPendingCerts = myCertifications.filter(c => c.status === 'pending' || c.status === 'in_progress').length;
  const myCompletedCerts = myCertifications.filter(c => c.status === 'completed').length;
  const completionRate = myCertifications.length > 0 
    ? Math.round((myCompletedCerts / myCertifications.length) * 100)
    : 0;

  const categories = [
    { value: 'all', label: 'All SOPs', icon: FileText },
    { value: 'kitchen', label: 'Kitchen', icon: '🍳' },
    { value: 'service', label: 'Service', icon: '🍽️' },
    { value: 'cleaning', label: 'Cleaning', icon: '🧹' },
    { value: 'hygiene', label: 'Hygiene', icon: '🧼' },
    { value: 'recipe', label: 'Recipes', icon: '📖' },
    { value: 'equipment', label: 'Equipment', icon: '⚙️' },
  ];

  const getCategoryColor = (category) => {
    const colors = {
      kitchen: 'bg-orange-100 text-orange-800 border-orange-300',
      service: 'bg-blue-100 text-blue-800 border-blue-300',
      cleaning: 'bg-purple-100 text-purple-800 border-purple-300',
      hygiene: 'bg-green-100 text-green-800 border-green-300',
      recipe: 'bg-pink-100 text-pink-800 border-pink-300',
      equipment: 'bg-gray-100 text-gray-800 border-gray-300',
      maintenance: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getSignatureStatus = (sopId) => {
    return signatures.find(s => s.sop_id === sopId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3 mb-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#014D40] to-emerald-600 flex items-center justify-center shadow-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
              Standard Operating Procedures
            </h1>
            <p className="text-gray-600">Your complete guide to restaurant operations</p>
          </div>
          
          {isManager && (
            <div className="flex gap-3">
              <Link to={createPageUrl("SOPBuilder")}>
                <Button className="bg-gradient-to-r from-[#014D40] to-emerald-600 hover:from-[#013830] hover:to-emerald-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create SOP
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total SOPs</p>
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{activeSops.length}</p>
              <p className="text-xs text-gray-500 mt-1">Active procedures</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">My Progress</p>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{completionRate}%</p>
              <p className="text-xs text-gray-500 mt-1">{myCompletedCerts} / {myCertifications.length} completed</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Pending</p>
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{myPendingCerts}</p>
              <p className="text-xs text-gray-500 mt-1">To complete</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Certifications</p>
                <Award className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{myCompletedCerts}</p>
              <p className="text-xs text-gray-500 mt-1">Earned</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Certifications Alert */}
        {myPendingCerts > 0 && (
          <Card className="mb-8 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-orange-900 mb-1">
                    {myPendingCerts} Procedure{myPendingCerts > 1 ? 's' : ''} Awaiting Completion
                  </h3>
                  <p className="text-sm text-orange-800">
                    Complete these SOPs to maintain your certification and compliance.
                  </p>
                </div>
                <Link to={createPageUrl("SOPCertifications")}>
                  <Button variant="outline" className="border-orange-300">
                    View All
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filter */}
        <Card className="mb-6 border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search SOPs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map(cat => (
                  <Button
                    key={cat.value}
                    variant={selectedCategory === cat.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.value)}
                    className={selectedCategory === cat.value ? "bg-[#014D40]" : ""}
                  >
                    {typeof cat.icon === 'string' ? cat.icon : <cat.icon className="w-4 h-4 mr-1" />}
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SOPs Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSops.map(sop => {
            const signature = getSignatureStatus(sop.id);
            const cert = myCertifications.find(c => c.sop_id === sop.id);
            
            return (
              <Card 
                key={sop.id}
                className="border-none shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
                onClick={() => navigate(createPageUrl(`SOPViewer?id=${sop.id}`))}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900 mb-2 group-hover:text-[#014D40] transition-colors">
                        {sop.title}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {sop.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className={`${getCategoryColor(sop.category)} border capitalize`}>
                      {sop.category}
                    </Badge>
                    {sop.frequency && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {sop.frequency}
                      </Badge>
                    )}
                    {signature && (
                      <Badge className="bg-green-100 text-green-800 border-green-300">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Signed
                      </Badge>
                    )}
                    {cert?.status === 'completed' && (
                      <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                        <Award className="w-3 h-3 mr-1" />
                        Certified
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                    {sop.total_time_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {sop.total_time_minutes} min
                      </span>
                    )}
                    {sop.view_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {sop.view_count} views
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      className="flex-1 bg-gradient-to-r from-[#014D40] to-emerald-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(createPageUrl(`SOPViewer?id=${sop.id}`));
                      }}
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      View SOP
                    </Button>
                    <Button 
                      variant="outline"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(createPageUrl(`SOPVoiceMode?id=${sop.id}`));
                      }}
                      title="Voice Mode"
                    >
                      <Mic className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredSops.length === 0 && (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No SOPs Found
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || selectedCategory !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'No procedures have been created yet'}
              </p>
              {isManager && (
                <Link to={createPageUrl("SOPBuilder")}>
                  <Button className="bg-gradient-to-r from-[#014D40] to-emerald-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First SOP
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <Link to={createPageUrl("SOPCertifications")}>
            <Card className="border-none shadow-lg hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-purple-50 to-indigo-50">
              <CardContent className="p-6">
                <Award className="w-8 h-8 text-purple-600 mb-3" />
                <h3 className="font-semibold text-lg text-gray-900 mb-1">
                  My Certifications
                </h3>
                <p className="text-sm text-gray-600">
                  Track your completed training
                </p>
              </CardContent>
            </Card>
          </Link>

          {isManager && (
            <>
              <Link to={createPageUrl("SOPBuilder")}>
                <Card className="border-none shadow-lg hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardContent className="p-6">
                    <Edit className="w-8 h-8 text-green-600 mb-3" />
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">
                      SOP Builder
                    </h3>
                    <p className="text-sm text-gray-600">
                      Create new procedures with AI
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link to={createPageUrl("SOPCertifications")}>
                <Card className="border-none shadow-lg hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-blue-50 to-cyan-50">
                  <CardContent className="p-6">
                    <Users className="w-8 h-8 text-blue-600 mb-3" />
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">
                      Team Progress
                    </h3>
                    <p className="text-sm text-gray-600">
                      Monitor team certifications
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
