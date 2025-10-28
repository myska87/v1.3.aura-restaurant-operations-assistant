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
  FileText,
  Search,
  Plus,
  Eye,
  Edit,
  Archive,
  Clock,
  Users,
  CheckCircle,
  PlayCircle,
  TrendingUp,
  Award,
  Filter,
  BookOpen,
  Home,
  ArrowLeft,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function SOPDashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  const { data: sops = [], isLoading } = useQuery({
    queryKey: ['sops'],
    queryFn: () => base44.entities.SOPDocument.list('-created_date', 100),
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
  const filteredSOPs = sops.filter(sop => {
    const matchesSearch = !searchQuery || 
      sop.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sop.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || sop.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || sop.status === selectedStatus;
    
    const matchesRole = !user?.position || 
      !sop.role_assigned || 
      sop.role_assigned.length === 0 ||
      sop.role_assigned.includes('all') ||
      sop.role_assigned.includes(user.position);
    
    return matchesSearch && matchesCategory && matchesStatus && matchesRole;
  });

  // Calculate stats
  const stats = {
    totalSOPs: sops.length,
    activeSOPs: sops.filter(s => s.status === 'active').length,
    draftSOPs: sops.filter(s => s.status === 'draft').length,
    mySignatures: signatures.length,
    completionRate: sops.length > 0 
      ? Math.round((signatures.length / sops.filter(s => s.status === 'active').length) * 100)
      : 0,
  };

  const categories = [
    { value: 'all', label: 'All SOPs', icon: '📚' },
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
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      archived: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getSignatureStatus = (sopId) => {
    return signatures.find(s => s.sop_id === sopId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("Dashboard")}>
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
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3 mb-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#014D40] to-emerald-600 flex items-center justify-center shadow-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
              Standard Operating Procedures
            </h1>
            <p className="text-gray-600">Your complete guide to Chai Patta operations</p>
          </div>
          
          {isManager && (
            <Link to={createPageUrl("SOPBuilder")}>
              <Button className="bg-gradient-to-r from-[#014D40] to-emerald-600 hover:from-[#013830] hover:to-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                Create SOP
              </Button>
            </Link>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-5 gap-6 mb-8">
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total SOPs</p>
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.totalSOPs}</p>
              <p className="text-xs text-gray-500 mt-1">All procedures</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Active</p>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.activeSOPs}</p>
              <p className="text-xs text-gray-500 mt-1">Published SOPs</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Drafts</p>
                <Edit className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.draftSOPs}</p>
              <p className="text-xs text-gray-500 mt-1">In progress</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">My Progress</p>
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.completionRate}%</p>
              <p className="text-xs text-gray-500 mt-1">{stats.mySignatures} signed</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Certifications</p>
                <Award className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.mySignatures}</p>
              <p className="text-xs text-gray-500 mt-1">Earned</p>
            </CardContent>
          </Card>
        </div>

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
              
              <div className="flex gap-2 flex-wrap">
                {categories.map(cat => (
                  <Button
                    key={cat.value}
                    variant={selectedCategory === cat.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.value)}
                    className={selectedCategory === cat.value ? "bg-[#014D40]" : ""}
                  >
                    {cat.icon} {cat.label}
                  </Button>
                ))}
              </div>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* SOPs Grid */}
        {isLoading ? (
          <Card className="mb-6">
            <CardContent className="p-12 text-center">
              <div className="animate-spin w-12 h-12 border-4 border-[#014D40] border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-600">Loading SOPs...</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSOPs.map((sop, index) => {
              const signature = getSignatureStatus(sop.id);
              
              return (
                <motion.div
                  key={sop.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card 
                    className="border-none shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group h-full"
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
                        <Badge className={getStatusColor(sop.status)}>
                          {sop.status}
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
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                        <span>v{sop.version || 1}</span>
                        {sop.last_reviewed_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {format(new Date(sop.last_reviewed_date), 'MMM d, yyyy')}
                          </span>
                        )}
                        {sop.view_count > 0 && (
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {sop.view_count}
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
                        {isManager && (
                          <Button 
                            variant="outline"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(createPageUrl(`SOPBuilder?id=${sop.id}`));
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredSOPs.length === 0 && (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No SOPs Found
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all'
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
      </div>
    </div>
  );
}