import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  FileText,
  Phone,
  Award,
  AlertTriangle,
  CheckCircle,
  Users,
  Mail,
  ArrowRight,
  Home,
  TrendingUp,
  MapPin,
  Star,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function LeafeDashboard() {
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: venues = [], isLoading: loadingVenues } = useQuery({
    queryKey: ['leafeVenues'],
    queryFn: () => base44.entities.LeafeVenue.list(),
  });

  const { data: hygieneScores = [] } = useQuery({
    queryKey: ['hygieneScores'],
    queryFn: () => base44.entities.LeafeHygieneScore.list(),
  });

  const { data: complaints = [] } = useQuery({
    queryKey: ['foodComplaints'],
    queryFn: () => base44.entities.LeafeFoodComplaint.list('-date_reported'),
  });

  const { data: audits = [] } = useQuery({
    queryKey: ['auditRecords'],
    queryFn: () => base44.entities.LeafeAuditRecord.list('-audit_date'),
  });

  // Access control
  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  // Calculate stats
  const activeVenues = venues.filter(v => v.status === 'active').length;
  const pendingComplaints = complaints.filter(c => c.resolved_status === 'pending' || c.resolved_status === 'investigating').length;
  const upcomingAudits = venues.filter(v => v.next_audit_due && new Date(v.next_audit_due) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length;

  // Group venues by area
  const venuesByArea = venues.reduce((acc, venue) => {
    const area = venue.area || 'other';
    if (!acc[area]) acc[area] = [];
    acc[area].push(venue);
    return acc;
  }, {});

  const mainFeatures = [
    {
      title: "Add Venues",
      description: "Manage multiple kitchen locations",
      icon: Building2,
      color: "from-blue-500 to-blue-600",
      path: "/leafe/venues",
      badge: `${activeVenues} active`,
    },
    {
      title: "HACCP Plans",
      description: "Upload & manage HACCP templates",
      icon: FileText,
      color: "from-green-500 to-emerald-600",
      path: "/leafe/haccp",
      badge: null,
    },
    {
      title: "Food Safety Hotline",
      description: "Instant contact + chat support",
      icon: Phone,
      color: "from-purple-500 to-purple-600",
      path: "/leafe/hotline",
      badge: "24/7",
    },
    {
      title: "Food Safety Certificates",
      description: "Upload, verify & renew certificates",
      icon: Award,
      color: "from-amber-500 to-yellow-600",
      path: "/leafe/certificates",
      badge: null,
    },
    {
      title: "Food Complaints",
      description: "Log & track consumer complaints",
      icon: AlertTriangle,
      color: "from-red-500 to-red-600",
      path: "/leafe/complaints",
      badge: pendingComplaints > 0 ? `${pendingComplaints} pending` : null,
    },
    {
      title: "Audits",
      description: "Record internal & external audits",
      icon: CheckCircle,
      color: "from-teal-500 to-cyan-600",
      path: "/leafe/audits",
      badge: upcomingAudits > 0 ? `${upcomingAudits} due soon` : null,
    },
    {
      title: "Manage Temp Staff",
      description: "Assign temporary & seasonal employees",
      icon: Users,
      color: "from-indigo-500 to-indigo-600",
      path: "/leafe/temp-staff",
      badge: null,
    },
    {
      title: "Contact Support",
      description: "Direct messaging to compliance team",
      icon: Mail,
      color: "from-pink-500 to-rose-600",
      path: "/leafe/support",
      badge: null,
    },
  ];

  if (!isManager) {
    return (
      <div className="p-6 md:p-8">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Access Restricted</h3>
            <p className="text-red-700">Leafe Dashboard is only accessible to managers and compliance officers.</p>
            <Link to={createPageUrl("Dashboard")}>
              <Button className="mt-4">
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: 'linear-gradient(rgba(250, 250, 250, 0.95), rgba(250, 250, 250, 0.95)), url(https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1920)',
      }}
    >
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#014D40] to-emerald-600 flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-[#014D40] to-emerald-600 bg-clip-text text-transparent">
                    Leafe Dashboard
                  </h1>
                  <p className="text-gray-600">Hygiene & Kitchen Management System</p>
                </div>
              </div>
            </div>
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="outline">
                <Home className="w-4 h-4 mr-2" />
                Main Dashboard
              </Button>
            </Link>
          </div>

          {/* Stats Overview */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-white/80 backdrop-blur border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Building2 className="w-8 h-8 text-blue-600" />
                  <Badge className="bg-blue-100 text-blue-800">Active</Badge>
                </div>
                <p className="text-3xl font-bold text-gray-900">{activeVenues}</p>
                <p className="text-sm text-gray-600">Total Venues</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Star className="w-8 h-8 text-amber-600" />
                  <Badge className="bg-amber-100 text-amber-800">Score</Badge>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {hygieneScores.length > 0 
                    ? (hygieneScores.reduce((sum, s) => sum + (s.score || 0), 0) / hygieneScores.length).toFixed(1)
                    : '0.0'}
                </p>
                <p className="text-sm text-gray-600">Avg Hygiene Score</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                  <Badge className="bg-red-100 text-red-800">Urgent</Badge>
                </div>
                <p className="text-3xl font-bold text-gray-900">{pendingComplaints}</p>
                <p className="text-sm text-gray-600">Pending Complaints</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <Badge className="bg-green-100 text-green-800">Due Soon</Badge>
                </div>
                <p className="text-3xl font-bold text-gray-900">{upcomingAudits}</p>
                <p className="text-sm text-gray-600">Upcoming Audits</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Feature Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {mainFeatures.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={idx}
                  className="bg-white/80 backdrop-blur border-none shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
                  onClick={() => navigate(createPageUrl(feature.path.replace('/leafe/', '')))}
                >
                  <CardContent className="p-6">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2 flex items-center justify-between">
                      {feature.title}
                      {feature.badge && (
                        <Badge variant="outline" className="text-xs">
                          {feature.badge}
                        </Badge>
                      )}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {feature.description}
                    </p>
                    <div className="flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-700">
                      Open
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Venues by Area */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-[#014D40]" />
              Venues by Area
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {Object.entries(venuesByArea).map(([area, areaVenues]) => {
                const areaScores = hygieneScores.filter(s => 
                  areaVenues.some(v => v.id === s.venue_id)
                );
                const avgScore = areaScores.length > 0
                  ? (areaScores.reduce((sum, s) => sum + (s.score || 0), 0) / areaScores.length).toFixed(1)
                  : 'N/A';

                return (
                  <Card 
                    key={area}
                    className="bg-white/80 backdrop-blur border-none shadow-lg hover:shadow-xl transition-all cursor-pointer"
                    onClick={() => navigate(createPageUrl(`LeafeVenues?area=${area}`))}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900 capitalize">
                          {area.replace('_', ' ')}
                        </h3>
                        <Badge className="bg-emerald-100 text-emerald-800">
                          {areaVenues.length} venues
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Avg Score</p>
                          <p className="text-2xl font-bold text-[#014D40]">{avgScore}</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {venues.length === 0 && (
                <Card className="bg-white/80 backdrop-blur border-none shadow-lg col-span-full">
                  <CardContent className="p-12 text-center">
                    <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No venues added yet</p>
                    <Button 
                      onClick={() => navigate(createPageUrl('LeafeVenues'))}
                      className="bg-gradient-to-r from-[#014D40] to-emerald-600"
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      Add Your First Venue
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}