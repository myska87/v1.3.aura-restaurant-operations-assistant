
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Thermometer,
  Droplets,
  PackageCheck, // Changed from Package
  Wrench,       // Added Wrench icon
  Award,
  Star,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Home,
  Plus,
  Eye,
  Calendar,
  Zap,
  Trophy,
  Target,
  Activity,
} from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function HygieneDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [selectedAction, setSelectedAction] = useState(null); // This state isn't strictly necessary as recordData.record_type holds the current action, but kept as per outline.
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [recordData, setRecordData] = useState({
    record_type: 'storage_fridge', // Default to a common type
    item_name: '',
    recorded_value: '',
    location: '',
    notes: ''
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: records = [], isLoading: loadingRecords } = useQuery({
    queryKey: ['hygieneRecords', selectedPeriod],
    queryFn: async () => {
      const allRecords = await base44.entities.HygieneRecord.list('-created_date');

      const now = new Date();
      let filterDate;

      if (selectedPeriod === 'today') {
        filterDate = new Date();
        filterDate.setHours(0, 0, 0, 0);
      } else if (selectedPeriod === 'week') {
        filterDate = startOfWeek(now);
      } else if (selectedPeriod === '30days') {
        filterDate = subDays(now, 30);
      }

      return allRecords.filter(r => new Date(r.created_date) >= filterDate);
    },
  });

  const { data: myScore } = useQuery({
    queryKey: ['myHygieneScore', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const scores = await base44.entities.HygieneUserScore.filter({
        staff_email: user.email
      });
      return scores[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['hygieneAlerts'],
    queryFn: async () => {
      const allAlerts = await base44.entities.HygieneAlertLog.list('-created_date');
      return allAlerts.filter(a => a.status === 'open' || a.status === 'acknowledged');
    },
  });

  const { data: teamScoreboard } = useQuery({
    queryKey: ['teamScoreboard'],
    queryFn: async () => {
      const scoreboards = await base44.entities.HygieneTeamScoreboard.list('-last_calculated');
      return scoreboards[0] || null;
    },
  });

  const checkIfInRange = (value, type) => {
    const numValue = parseFloat(value);
    // For cleaning and equipment_check, if a value is recorded (e.g., 'Pass' or 'Clean'), it's considered in range.
    // If it's a numerical record type, check against defined ranges.
    if (type === 'cleaning' || type === 'equipment_check') {
      return value !== null && value !== ''; // Assume any record implies compliance
    }
    if (isNaN(numValue)) return false; // If numerical type, but value is not a number

    const ranges = {
      storage_fridge: { min: 0, max: 5 },
      storage_freezer: { min: -22, max: -18 },
      cooking: { min: 75, max: 100 }, // Assuming 75°C is the target core temperature
      cooling: { min: 0, max: 8 },    // Cooled down to 8°C or below
      delivery: { min: 0, max: 5 }
    };
    const range = ranges[type];
    if (!range) return true; // No specific numerical range defined, default to true
    return numValue >= range.min && numValue <= range.max;
  };

  const createRecordMutation = useMutation({
    mutationFn: async (data) => {
      if (!user?.email) throw new Error("User not authenticated.");

      const valueToRecord = ['storage_fridge', 'storage_freezer', 'cooking', 'cooling', 'delivery'].includes(data.record_type)
        ? parseFloat(data.recorded_value)
        : data.recorded_value; // Keep as string for non-numerical types

      const isInRange = checkIfInRange(valueToRecord, data.record_type);
      const pointsAwarded = isInRange ? 10 : 0; // Award points only if in range

      const recordWithDefaults = {
        ...data,
        recorded_value: valueToRecord,
        recorded_by_email: user.email,
        recorded_by_name: user.full_name,
        venue_id: user.venue_id || 'default_venue_id', // Ensure a fallback
        venue_name: user.venue_name || 'Default Venue Name', // Ensure a fallback
        is_in_range: isInRange,
        variance_alert: !isInRange,
        points_awarded: pointsAwarded,
        status: 'recorded'
      };

      const record = await base44.entities.HygieneRecord.create(recordWithDefaults);

      // Update user score
      const userScores = await base44.entities.HygieneUserScore.filter({
        staff_email: user.email
      });

      if (userScores.length > 0) {
        await base44.entities.HygieneUserScore.update(userScores[0].id, {
          total_points: (userScores[0].total_points || 0) + pointsAwarded,
          points_this_week: (userScores[0].points_this_week || 0) + pointsAwarded,
          total_records: (userScores[0].total_records || 0) + 1,
          records_on_time: (userScores[0].records_on_time || 0) + (isInRange ? 1 : 0)
        });
      } else {
        await base44.entities.HygieneUserScore.create({
          staff_email: user.email,
          staff_name: user.full_name,
          total_points: pointsAwarded,
          points_this_week: pointsAwarded,
          total_records: 1,
          records_on_time: isInRange ? 1 : 0
        });
      }

      return record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hygieneRecords'] });
      queryClient.invalidateQueries({ queryKey: ['myHygieneScore'] });
      setShowRecordForm(false);
      setRecordData({
        record_type: 'storage_fridge',
        item_name: '',
        recorded_value: '',
        location: '',
        notes: ''
      });
    },
    onError: (error) => {
      console.error("Error creating hygiene record:", error);
      alert("Failed to create record. Please try again. " + error.message);
    }
  });

  const handleQuickAction = (actionType) => {
    setSelectedAction(actionType); // Updates the redundant state, but also sets the record type for the form
    setRecordData({
      record_type: actionType,
      item_name: '', // Resetting fields to empty for a new quick action
      recorded_value: '',
      location: '',
      notes: ''
    });
    setShowRecordForm(true);
  };

  const handleSubmitRecord = () => {
    // Basic validation
    if (!recordData.item_name) {
      alert('Please provide an item name.');
      return;
    }
    if (['storage_fridge', 'storage_freezer', 'cooking', 'cooling', 'delivery'].includes(recordData.record_type)) {
      if (recordData.recorded_value === '' || isNaN(parseFloat(recordData.recorded_value))) {
        alert('Please enter a valid temperature/value.');
        return;
      }
    }
    createRecordMutation.mutate(recordData);
  };

  const getRecommendedRange = (type) => {
    const ranges = {
      storage_fridge: '0-5°C (chilled)',
      storage_freezer: '-18°C to -22°C (frozen)',
      cooking: '75°C+ (core temp)',
      cooling: '0-8°C within 90 min',
      delivery: '0-5°C (chilled goods)',
      cleaning: 'Pass/Fail check',
      equipment_check: 'Pass/Fail check'
    };
    return ranges[type] || 'Check standards';
  };

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  // Calculate stats
  const todayRecords = records.filter(r => {
    const recordDate = new Date(r.created_date);
    const today = new Date();
    return recordDate.toDateString() === today.toDateString();
  });

  const temperatureRecords = records.filter(r =>
    ['delivery', 'storage_fridge', 'storage_freezer', 'cooking', 'cooling'].includes(r.record_type)
  );

  const cleaningRecords = records.filter(r => r.record_type === 'cleaning');
  const deliveryRecords = records.filter(r => r.record_type === 'delivery');

  const recordsInRange = records.filter(r => r.is_in_range !== false).length;
  const complianceRate = records.length > 0
    ? Math.round((recordsInRange / records.length) * 100)
    : 100;

  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'urgent').length;
  const openAlerts = alerts.filter(a => a.status === 'open').length;

  // Star rating calculation
  const calculateStarRating = () => {
    if (complianceRate >= 98) return 5;
    if (complianceRate >= 95) return 4;
    if (complianceRate >= 90) return 3;
    if (complianceRate >= 80) return 2;
    if (complianceRate >= 70) return 1;
    return 0;
  };

  const starRating = calculateStarRating();

  // Audit readiness
  const auditReadiness = () => {
    let score = 100;

    // Deduct for open alerts
    score -= openAlerts * 5;

    // Deduct for low compliance
    if (complianceRate < 95) score -= (95 - complianceRate);

    // Deduct for missing records (expected vs actual)
    const expectedRecords = 10; // Expected per day
    const actualRecords = todayRecords.length;
    if (actualRecords < expectedRecords) {
      score -= (expectedRecords - actualRecords) * 3;
    }

    return Math.max(0, Math.min(100, score));
  };

  const auditScore = auditReadiness();

  // Removed old quickActions array as it's replaced by hardcoded cards with onClick handlers.

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 p-6 md:p-8"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3 mb-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#014D40] to-emerald-600 flex items-center justify-center shadow-lg">
                <Activity className="w-8 h-8 text-white" />
              </div>
              Hygiene Central
            </h1>
            <p className="text-gray-600">Smart hygiene tracking with real-time EHO compliance</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border rounded-lg text-sm font-medium"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Top Stats Row */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Today's Records</p>
                  <p className="text-3xl font-bold text-gray-900">{todayRecords.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-green-600 font-medium">On track</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Compliance Rate</p>
                  <p className="text-3xl font-bold text-gray-900">{complianceRate}%</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${complianceRate}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Leafe Star Rating</p>
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star
                        key={i}
                        className={`w-6 h-6 ${
                          i <= starRating
                            ? 'fill-[#E0B037] text-[#E0B037]'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="p-3 bg-amber-100 rounded-xl">
                  <Award className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <p className="text-xs text-gray-600">
                {starRating === 5 && "Outstanding hygiene standards"}
                {starRating === 4 && "Excellent hygiene practices"}
                {starRating === 3 && "Good hygiene compliance"}
                {starRating < 3 && "Improvement needed"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Audit Readiness</p>
                  <p className="text-3xl font-bold text-gray-900">{auditScore}%</p>
                </div>
                <div className={`p-3 rounded-xl ${
                  auditScore >= 95 ? 'bg-green-100' :
                  auditScore >= 80 ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  {auditScore >= 95 ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <AlertTriangle className={`w-6 h-6 ${
                      auditScore >= 80 ? 'text-yellow-600' : 'text-red-600'
                    }`} />
                  )}
                </div>
              </div>
              <Badge className={
                auditScore >= 95 ? 'bg-green-100 text-green-800' :
                auditScore >= 80 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }>
                {auditScore >= 95 ? '✅ EHO Ready' : auditScore >= 80 ? '⚠️ Nearly Ready' : '❌ Action Required'}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Active Alerts */}
        {alerts.length > 0 && (
          <Card className="mb-8 border-none shadow-lg bg-gradient-to-r from-red-50 to-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-900">
                <AlertTriangle className="w-5 h-5" />
                Active Alerts ({alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.slice(0, 3).map(alert => (
                  <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        alert.severity === 'critical' || alert.severity === 'urgent'
                          ? 'bg-red-500'
                          : 'bg-yellow-500'
                      }`} />
                      <div>
                        <p className="font-medium text-gray-900">{alert.item_name}</p>
                        <p className="text-sm text-gray-600">
                          {alert.location} • {alert.alert_type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Resolve
                    </Button>
                  </div>
                ))}
              </div>
              {alerts.length > 3 && (
                <Button variant="link" className="mt-2 w-full">
                  View all {alerts.length} alerts
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card
              className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white cursor-pointer hover:shadow-xl transition-all"
              onClick={() => handleQuickAction('storage_fridge')}
            >
              <CardContent className="p-6">
                <Thermometer className="w-12 h-12 mb-4 opacity-90" />
                <h3 className="text-xl font-bold mb-2">Temperature Log</h3>
                <p className="text-blue-100 text-sm">Fridge, freezer & cooking temps</p>
                <div className="mt-4 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Quick Record</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card
              className="bg-gradient-to-br from-purple-500 to-pink-500 text-white cursor-pointer hover:shadow-xl transition-all"
              onClick={() => handleQuickAction('cleaning')}
            >
              <CardContent className="p-6">
                <Droplets className="w-12 h-12 mb-4 opacity-90" />
                <h3 className="text-xl font-bold mb-2">Cleaning Record</h3>
                <p className="text-purple-100 text-sm">Log cleaning & sanitization</p>
                <div className="mt-4 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Log Cleaning</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card
              className="bg-gradient-to-br from-orange-500 to-red-500 text-white cursor-pointer hover:shadow-xl transition-all"
              onClick={() => handleQuickAction('delivery')}
            >
              <CardContent className="p-6">
                <PackageCheck className="w-12 h-12 mb-4 opacity-90" />
                <h3 className="text-xl font-bold mb-2">Delivery Check</h3>
                <p className="text-orange-100 text-sm">Verify goods on arrival</p>
                <div className="mt-4 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Check Delivery</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card
              className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white cursor-pointer hover:shadow-xl transition-all"
              onClick={() => handleQuickAction('equipment_check')}
            >
              <CardContent className="p-6">
                <Wrench className="w-12 h-12 mb-4 opacity-90" />
                <h3 className="text-xl font-bold mb-2">Equipment Check</h3>
                <p className="text-emerald-100 text-sm">Monitor equipment status</p>
                <div className="mt-4 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Quick Check</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Record Form Dialog */}
        <Dialog open={showRecordForm} onOpenChange={setShowRecordForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-[#014D40]" />
                Quick Hygiene Record
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Record Type</Label>
                <select
                  value={recordData.record_type}
                  onChange={(e) => setRecordData({...recordData, record_type: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="storage_fridge">Fridge Temperature</option>
                  <option value="storage_freezer">Freezer Temperature</option>
                  <option value="cooking">Cooking Temperature</option>
                  <option value="cooling">Cooling Check</option>
                  <option value="delivery">Delivery Temperature</option>
                  <option value="cleaning">Cleaning Check</option>
                  <option value="equipment_check">Equipment Check</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: {getRecommendedRange(recordData.record_type)}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Item Name *</Label>
                <Input
                  placeholder="e.g., Main Fridge, Chicken Breast, Walk-in Freezer"
                  value={recordData.item_name}
                  onChange={(e) => setRecordData({...recordData, item_name: e.target.value})}
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Temperature / Value *</Label>
                <Input
                  type="text" // Use text type for input to allow non-numeric for some record types, and parseFloat later.
                  placeholder="e.g., 3.5 or 'Clean'"
                  value={recordData.recorded_value}
                  onChange={(e) => setRecordData({...recordData, recorded_value: e.target.value})}
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Location</Label>
                <Input
                  placeholder="e.g., Kitchen Main, Prep Area, Storage Room"
                  value={recordData.location}
                  onChange={(e) => setRecordData({...recordData, location: e.target.value})}
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Notes (Optional)</Label>
                <Textarea
                  placeholder="Any observations or corrective actions taken..."
                  value={recordData.notes}
                  onChange={(e) => setRecordData({...recordData, notes: e.target.value})}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRecordForm(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitRecord}
                disabled={createRecordMutation.isPending}
                className="bg-[#014D40] hover:bg-[#013830]"
              >
                {createRecordMutation.isPending ? 'Saving...' : 'Save Record (+10 pts)'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Gamification Section */}
        {myScore && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-purple-600" />
                  Your Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-4xl font-bold text-purple-900">{myScore.points_this_week || 0}</p>
                    <p className="text-sm text-gray-600">Points this week</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{myScore.total_points || 0}</p>
                    <p className="text-xs text-gray-600">Total points</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Current Streak</span>
                    <Badge className="bg-orange-100 text-orange-800">
                      🔥 {myScore.current_streak || 0} days
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Compliance Rate</span>
                    <span className="font-bold text-green-600">{myScore.compliance_rate || 0}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Venue Rank</span>
                    <Badge variant="outline">
                      #{myScore.rank_in_venue || '-'}
                    </Badge>
                  </div>
                </div>

                {myScore.badges_earned && myScore.badges_earned.length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Recent Badges</p>
                    <div className="flex gap-2 flex-wrap">
                      {myScore.badges_earned.slice(0, 5).map((badge, i) => (
                        <div
                          key={i}
                          className="text-2xl"
                          title={badge.badge_name}
                        >
                          {badge.badge_icon}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-600" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      title: "Clean Sweep",
                      description: "Complete all daily records",
                      icon: "🧹",
                      progress: Math.min(100, (todayRecords.length / 10) * 100),
                      unlocked: todayRecords.length >= 10
                    },
                    {
                      title: "Quick Chill",
                      description: "All temps within safe limits",
                      icon: "❄️",
                      progress: complianceRate,
                      unlocked: complianceRate >= 98
                    },
                    {
                      title: "Zero Alerts",
                      description: "7 days without variance",
                      icon: "✅",
                      progress: Math.min(100, ((myScore?.current_streak || 0) / 7) * 100),
                      unlocked: (myScore?.current_streak || 0) >= 7
                    },
                  ].map((achievement, i) => (
                    <div key={i} className="p-4 bg-white rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{achievement.icon}</span>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{achievement.title}</p>
                          <p className="text-xs text-gray-600">{achievement.description}</p>
                        </div>
                        {achievement.unlocked && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Unlocked
                          </Badge>
                        )}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-yellow-500 h-2 rounded-full transition-all"
                          style={{ width: `${achievement.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Records */}
        <Card className="border-none shadow-lg bg-white/90 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#014D40]" />
                Recent Records
              </span>
              <Link to={createPageUrl("/hygiene/my-records")}>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No records yet today</p>
                <Button onClick={() => handleQuickAction('storage_fridge')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Record
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {records.slice(0, 5).map(record => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        record.is_in_range === false
                          ? 'bg-red-100'
                          : 'bg-green-100'
                      }`}>
                        {record.is_in_range === false ? (
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{record.item_name}</p>
                        <p className="text-sm text-gray-600">
                          {record.record_type.replace('_', ' ')} •
                          {record.recorded_value !== null && !isNaN(record.recorded_value) && ` ${record.recorded_value}°C`}
                          {record.recorded_value !== null && isNaN(record.recorded_value) && ` ${record.recorded_value}`} •
                          {format(new Date(record.created_date), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{record.recorded_by_name}</p>
                      {record.points_awarded > 0 && (
                        <Badge className="bg-purple-100 text-purple-800 text-xs">
                          +{record.points_awarded} pts
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
