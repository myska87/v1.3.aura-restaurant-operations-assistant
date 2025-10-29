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
  CheckCircle,
  Edit,
  TrendingUp,
  Award,
  BookOpen,
  Target,
  Utensils,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function SOPDashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  const { data: sops = [], isLoading } = useQuery({
    queryKey: ['sops'],
    queryFn: () => base44.entities.SOPDocument.list('-created_date', 100),
    refetchInterval: 5000,
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

  const filteredSOPs = sops.filter(sop => {
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

  const stats = {
    totalSOPs: sops.length,
    activeSOPs: sops.filter(s => s.status === 'active').length,
    draftSOPs: sops.filter(s => s.status === 'draft').length,
    mySignatures: signatures.length,
    completionRate: sops.length > 0 
      ? Math.round((signatures.length / sops.filter(s => s.status === 'active').length) * 100)
      : 0,
  };

  const categoryCounts = sops.reduce((acc, sop) => {
    acc[sop.category] = (acc[sop.category] || 0) + 1;
    return acc;
  }, {});

  const categories = [
    { value: 'all', label: 'All SOPs', icon: FileText, color: 'bg-gray-500' },
    { value: 'kitchen', label: 'Kitchen', icon: Utensils, color: 'bg-orange-500' },
    { value: 'service', label: 'Service', icon: Target, color: 'bg-blue-500' },
    { value: 'cleaning', label: 'Cleaning', icon: Sparkles, color: 'bg-purple-500' },
    { value: 'hygiene', label: 'Hygiene', icon: ShieldCheck, color: 'bg-green-500' },
    { value: 'recipe', label: 'Recipes', icon: BookOpen, color: 'bg-pink-500' },
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
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{stats.totalSOPs}</p>
            <p className="text-xs text-gray-600">Total SOPs</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{stats.activeSOPs}</p>
            <p className="text-xs text-gray-600">Active</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Edit className="w-6 h-6 text-amber-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{stats.draftSOPs}</p>
            <p className="text-xs text-gray-600">Drafts</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{stats.completionRate}%</p>
            <p className="text-xs text-gray-600">My Progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Award className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{stats.mySignatures}</p>
            <p className="text-xs text-gray-600">Signed</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Tabs */}
      <Card>
        <CardContent className="p-0">
          <div className="flex overflow-x-auto scrollbar-hide">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const count = cat.value === 'all' ? stats.totalSOPs : (categoryCounts[cat.value] || 0);
              const isActive = selectedCategory === cat.value;
              
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all whitespace-nowrap ${
                    isActive 
                      ? 'border-[#014D40] bg-emerald-50 text-[#014D40] font-semibold' 
                      : 'border-transparent hover:bg-gray-50 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? cat.color.replace('bg-', 'text-') : 'text-gray-400'}`} />
                  <span>{cat.label}</span>
                  <Badge variant="outline" className={isActive ? 'bg-emerald-100 border-emerald-300' : ''}>
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search SOPs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* SOPs Grid */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-[#014D40] border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading SOPs...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        <h3 className="font-bold text-lg text-gray-900 group-hover:text-[#014D40] transition-colors mb-2">
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
                      {signature && (
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Signed
                        </Badge>
                      )}
                    </div>

                    <Button 
                      className="w-full bg-gradient-to-r from-[#014D40] to-emerald-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(createPageUrl(`SOPViewer?id=${sop.id}`));
                      }}
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      View SOP
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {!isLoading && filteredSOPs.length === 0 && (
        <Card>
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
    </div>
  );
}