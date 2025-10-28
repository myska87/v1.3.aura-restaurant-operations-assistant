import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PartyPopper, Mail, CheckCircle, AlertCircle, X } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Welcome New User Component
 * Shows welcome message for newly registered users
 * Handles email confirmation resending
 */
export default function WelcomeNewUser() {
  const [dismissed, setDismissed] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const resendConfirmationMutation = useMutation({
    mutationFn: async () => {
      // Send confirmation email
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: 'Welcome to AURA One Pro! 🎉',
        body: `Hello ${user.full_name},

Welcome to AURA One Pro - Your Restaurant Operations Assistant!

We're excited to have you on board. Here's what you can do:

✅ View your shifts and schedule
✅ Complete daily tasks and checklists
✅ Access training materials and SOPs
✅ Track your performance and achievements
✅ Communicate with your team

Your account is now active and ready to use.

If you have any questions, please contact your manager.

Best regards,
AURA Team`,
      });
    },
    onSuccess: () => {
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 5000);
    },
  });

  // Only show for users created in last 24 hours
  if (!user || dismissed) return null;

  const createdDate = user.created_date ? new Date(user.created_date) : null;
  const isNewUser = createdDate && (Date.now() - createdDate.getTime()) < 24 * 60 * 60 * 1000;

  if (!isNewUser) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-6 right-6 z-50 max-w-md"
    >
      <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none shadow-2xl">
        <CardContent className="p-6 relative">
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-3 right-3 p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <PartyPopper className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Welcome, {user.full_name}! 🎉</h3>
              <p className="text-sm text-emerald-50 mb-2">
                Your account has been successfully created.
              </p>
              <Badge className="bg-white/20 text-white border-white/30">
                {user.position || 'Team Member'}
              </Badge>
            </div>
          </div>

          {emailSent ? (
            <div className="flex items-center gap-2 p-3 bg-white/20 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">Welcome email sent successfully!</span>
            </div>
          ) : (
            <Button
              onClick={() => resendConfirmationMutation.mutate()}
              disabled={resendConfirmationMutation.isPending}
              variant="secondary"
              className="w-full"
              size="sm"
            >
              {resendConfirmationMutation.isPending ? (
                <>
                  <Mail className="w-4 h-4 mr-2 animate-pulse" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Welcome Email
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}