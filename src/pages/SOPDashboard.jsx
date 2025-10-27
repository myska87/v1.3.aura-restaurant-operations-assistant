import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
  TrendingUp,
  FileText,
  Home,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { AuraSectionHeader, AuraStatCard, AuraEmptyState } from '../components/AuraDesignSystem';

export default function SOPDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

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
    queryKey: ['sopSignatures'],
    queryFn: () => base44.entities.SOPSignatureLog.list('-signed_at', 200),
  });

  const deleteSopMutation = useMutation({
    mutationFn: (id) => base44.entities.SOPDocument.update(id, { active_status: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sops'] });
    },
  });

  // Filter SOPs
  const filteredSops = sops.filter(sop => {
    if (!sop.active_status) return false;

    const matchesSearch = sop.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sop.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sop.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = filterCategory === 'all' || sop.category === filterCategory;
    const matchesRole = filterRole === 'all' || sop.role_assigned?.includes(filterRole);

    let matchesStatus = true;
    if (filterStatus === 'review_due') {
      const daysUntilReview = sop.next_review_date 
        ? differenceInDays(new Date(sop.next_review_date), new Date())
        : 999;
      matchesStatus = daysUntilReview <= 30;
    } else if (filterStatus === 'overdue') {
      const daysUntilReview = sop.next_review_date 
        ? differenceInDays(new Date(sop.next_review_date), new Date())
        : 999;
      matchesStatus = daysUntilReview < 0;
    }

    return matchesSearch && matchesCategory && matchesRole && matchesStatus;
  });

  // Calculate stats
  const totalSOPs = sops.filter(s => s.active_status).length;
  const reviewDueSoon = sops.filter(s => {
    if (!s.active_status || !s.next_review_date) return false;
    const daysUntilReview = differenceInDays(new Date(s.next_review_date), new Date());
    return daysUntilReview >= 0 && daysUntilReview <= 30;
  }).length;
  const overdue = sops.filter(s => {
    if (!s.active_status || !s.next_review_date) return false;
    return differenceInDays(new Date(s.next_review_date), new Date()) < 0;
  }).length;
  const totalViews = sops.reduce((sum, sop) => sum + (sop.view_count || 0), 0);
  const totalSignatures = signatures.length;

  const handleDelete = (sop) => {
    if (confirm(`Are you sure you want to delete "${sop.title}"? This cannot be undone.`)) {
      deleteSopMutation.mutate(sop.id);
    }
  };

  const getReviewStatus = (nextReviewDate) => {
    if (!nextReviewDate) return null;
    
    const daysUntilReview = differenceInDays(new Date(nextReviewDate), new Date());
    
    if (daysUntilReview < 0) {
      return {
        label: `${Math.abs(daysUntilReview)} days overdue`,
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: AlertTriangle
      };
    } else if (daysUntilReview <= 30) {
      return {
        label: `Review due in ${daysUntilReview} days`,
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: Clock
      };
    }
    
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Navigation */}
        <div className="flex gap-3">
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
        <div>
          <AuraSectionHeader
            icon={BookOpen}
            title="📋 Standard Operating Procedures"
            subtitle="Your complete operational knowledge base"
            action={
              isManager && (
                <div className="flex gap-3">
                  <Button
                    onClick={() => navigate(createPageUrl('SOPBuilder'))}
                    className="bg-gradient-to-r from-[#014D40] to-emerald-600 hover:from-[#013830] hover:to-emerald-700 text-white shadow-lg"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create SOP
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#014D40] text-[#014D40]"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    AI Generate
                  </Button>
                </div>
              )
            }
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <AuraStatCard
            title="Total SOPs"
            value={totalSOPs}
            icon={BookOpen}
            color="teal"
            subtitle="Active procedures"
          />
          <AuraStatCard
            title="Review Due Soon"
            value={reviewDueSoon}
            icon={Clock}
            color="orange"
            subtitle="Next 30 days"
          />
          <AuraStatCard
            title="Overdue"
            value={overdue}
            icon={AlertTriangle}
            color="red"
            subtitle="Needs attention"
          />
          <AuraStatCard
            title="Total Views"
            value={totalViews}
            icon={Eye}
            color="blue"
            subtitle="All time"
          />
          <AuraStatCard
            title="Signatures"
            value={totalSignatures}
            icon={CheckCircle}
            color="green"
            subtitle="Acknowledgments"
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
                    placeholder="Search SOPs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="recipe">Recipe</SelectItem>
                  <SelectItem value="kitchen">Kitchen</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="hygiene">Hygiene</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="customer_service">Customer Service</SelectItem>
                </SelectContent>
              </Select>

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
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="review_due">Review Due Soon</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* SOPs Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading && (
            <Card className="col-span-full">
              <CardContent className="p-12 text-center">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
                <p className="text-gray-600">Loading SOPs...</p>
              </CardContent>
            </Card>
          )}

          {!isLoading && filteredSops.length === 0 && (
            <div className="col-span-full">
              <AuraEmptyState
                icon={BookOpen}
                title="No SOPs found"
                message={searchQuery || filterCategory !== 'all' || filterRole !== 'all'
                  ? "Try adjusting your filters"
                  : "Create your first SOP to get started"
                }
                action={
                  isManager && (
                    <Button onClick={() => navigate(createPageUrl('SOPBuilder'))} className="bg-[#014D40]">
                      <Plus className="w-4 h-4 mr-2" />
                      Create SOP
                    </Button>
                  )
                }
              />
            </div>
          )}

          {filteredSops.map((sop) => {
            const reviewStatus = getReviewStatus(sop.next_review_date);
            const ReviewIcon = reviewStatus?.icon;
            const mySignature = signatures.find(s => 
              s.sop_id === sop.id && s.staff_email === user?.email
            );
            const completionRate = sop.signature_count && sop.view_count 
              ? Math.round((sop.signature_count / sop.view_count) * 100)
              : 0;

            return (
              <Card
                key={sop.id}
                className="bg-white border-none shadow-sm hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => navigate(createPageUrl(`SOPViewer?id=${sop.id}`))}
              >
                {sop.hero_image_url && (
                  <div className="h-40 overflow-hidden bg-gray-100">
                    <img
                      src={sop.hero_image_url}
                      alt={sop.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <Badge className="bg-emerald-100 text-emerald-800 capitalize">
                      {sop.category}
                    </Badge>
                    {isManager && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(createPageUrl(`SOPBuilder?id=${sop.id}`));
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(sop);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">
                    {sop.title}
                  </h3>

                  {sop.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {sop.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-4">
                    {sop.total_time_minutes && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {sop.total_time_minutes} min
                      </Badge>
                    )}
                    {sop.steps && (
                      <Badge variant="outline" className="text-xs">
                        {sop.steps.length} steps
                      </Badge>
                    )}
                    {sop.difficulty_level && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {sop.difficulty_level}
                      </Badge>
                    )}
                    {mySignature && (
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Signed
                      </Badge>
                    )}
                  </div>

                  {reviewStatus && (
                    <div className={`flex items-center gap-2 text-xs p-2 rounded-lg border ${reviewStatus.color} mb-3`}>
                      <ReviewIcon className="w-4 h-4" />
                      {reviewStatus.label}
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{sop.view_count || 0} views</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{sop.signature_count || 0} signed</span>
                    </div>
                    <span>v{sop.version}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}