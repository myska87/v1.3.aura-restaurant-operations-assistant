import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { differenceInDays } from "date-fns";

export default function WelcomeNewHire() {
  const [dismissed, setDismissed] = React.useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  // OPTIMIZED: Only query if user exists
  const { data: onboardingProgress = [] } = useQuery({
    queryKey: ['onboardingProgress', user?.email],
    queryFn: () => base44.entities.OnboardingProgress.filter({ staff_email: user?.email }),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  if (!user || dismissed) return null;

  const hireDate = user.hire_date ? new Date(user.hire_date) : null;
  const daysAtCompany = hireDate ? differenceInDays(new Date(), hireDate) : null;

  const isNewHire = daysAtCompany !== null && daysAtCompany <= 30;
  const completedSteps = onboardingProgress.filter(p => p.status === 'completed').length;
  const totalSteps = onboardingProgress.length;
  const hasIncompleteOnboarding = totalSteps > 0 && completedSteps < totalSteps;

  if (!isNewHire || !hasIncompleteOnboarding) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm">
      <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white border-none shadow-2xl">
        <CardContent className="p-6 relative">
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Welcome Aboard! 🎉</h3>
              <p className="text-sm text-white/90">
                You've completed {completedSteps} of {totalSteps} onboarding steps
              </p>
            </div>
          </div>

          <Link to={createPageUrl('OnboardingTraining')}>
            <Button className="w-full bg-white text-purple-600 hover:bg-white/90">
              Continue Onboarding
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}