import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, ArrowLeft, Home, Trophy, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function CoachingAchievements() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: badges = [], isLoading } = useQuery({
    queryKey: ['allMyBadges', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.CoachingBadge.filter({
        staff_email: user.email
      }, '-date_awarded', 100);
    },
    enabled: !!user?.email,
  });

  // Group badges by type
  const badgesByType = badges.reduce((acc, badge) => {
    const type = badge.badge_type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(badge);
    return acc;
  }, {});

  const badgeTypeLabels = {
    performance: { label: 'Performance Excellence', icon: '🏆', color: 'from-yellow-500 to-amber-500' },
    consistency: { label: 'Consistency Champion', icon: '⭐', color: 'from-blue-500 to-indigo-500' },
    improvement: { label: 'Growth Mindset', icon: '📈', color: 'from-green-500 to-emerald-500' },
    milestone: { label: 'Milestone Achievements', icon: '🎯', color: 'from-purple-500 to-pink-500' },
    leadership: { label: 'Leadership & Teamwork', icon: '👥', color: 'from-red-500 to-orange-500' },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Buttons */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("MyCoaching")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to My Coaching
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
        <Card className="bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 text-white border-none mb-8">
          <CardContent className="p-8">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-2xl">
                <Trophy className="w-12 h-12" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">🏆 Achievements & Badges</h1>
                <p className="text-yellow-100 text-lg">
                  You've earned {badges.length} badge{badges.length !== 1 ? 's' : ''}!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading achievements...</p>
          </div>
        ) : badges.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Award className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Badges Yet</h2>
              <p className="text-gray-600 mb-6">
                Keep attending coaching sessions and demonstrating great performance to earn badges!
              </p>
              <Link to={createPageUrl('MyCoaching')}>
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to My Coaching
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(badgesByType).map(([type, typeBadges], sectionIndex) => {
              const typeInfo = badgeTypeLabels[type] || { label: 'Other Achievements', icon: '🎖️', color: 'from-gray-500 to-gray-600' };
              
              return (
                <div key={type}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-3 bg-gradient-to-br ${typeInfo.color} rounded-xl text-white text-2xl`}>
                      {typeInfo.icon}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{typeInfo.label}</h2>
                    <span className="text-gray-500">({typeBadges.length})</span>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {typeBadges.map((badge, index) => (
                      <motion.div
                        key={badge.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: sectionIndex * 0.1 + index * 0.05 }}
                      >
                        <Card className="border-2 border-yellow-200 hover:shadow-xl transition-shadow bg-gradient-to-br from-white to-yellow-50">
                          <CardContent className="p-6">
                            <div className="text-center mb-4">
                              <div className="text-6xl mb-3">{badge.badge_icon}</div>
                              <h3 className="font-bold text-xl text-gray-900 mb-2">{badge.badge_name}</h3>
                              <p className="text-sm text-gray-600 mb-3">{badge.description}</p>
                              {badge.points_value > 0 && (
                                <div className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                                  <Star className="w-4 h-4" />
                                  {badge.points_value} points
                                </div>
                              )}
                            </div>

                            <div className="pt-4 border-t border-yellow-200">
                              <p className="text-xs text-gray-500 text-center">
                                Earned on {format(new Date(badge.date_awarded), 'MMMM d, yyyy')}
                              </p>
                              {badge.awarded_by && (
                                <p className="text-xs text-gray-500 text-center mt-1">
                                  Awarded by {badge.awarded_by}
                                </p>
                              )}
                            </div>

                            {badge.celebration_message && (
                              <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                                <p className="text-sm text-green-800 italic text-center">
                                  "{badge.celebration_message}"
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}