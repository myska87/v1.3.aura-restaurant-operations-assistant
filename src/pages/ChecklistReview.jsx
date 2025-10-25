import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, ArrowLeft, Eye, Sun, Moon, Clock } from "lucide-react";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ChecklistReview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [managerNotes, setManagerNotes] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ['reviewChecklists'],
    queryFn: () => base44.entities.DailyChecklist.filter({
      status: 'completed'
    }, '-completed_time'),
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, approved }) => {
      await base44.entities.DailyChecklist.update(id, {
        status: approved ? 'verified' : 'rejected',
        verified_by_email: user?.email,
        verified_by_name: user?.full_name,
        verified_at: new Date().toISOString(),
        ...((!approved) && { rejection_reason: managerNotes })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviewChecklists'] });
      setShowDialog(false);
      setSelectedChecklist(null);
      setManagerNotes('');
    },
  });

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <Link to={createPageUrl("DailyChecklists")}>
          <Button variant="outline" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Checklists
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Checklist Review Queue
          </h1>
          <p className="text-lg text-gray-600">
            {checklists.length} checklists awaiting verification
          </p>
        </div>

        {checklists.length === 0 ? (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                All Caught Up!
              </h3>
              <p className="text-gray-600">
                No checklists pending review
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {checklists.map((checklist) => {
              const TypeIcon = checklist.checklist_type === 'opening' ? Sun : Moon;
              
              return (
                <Card key={checklist.id} className="bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${
                          checklist.checklist_type === 'opening' 
                            ? 'bg-green-100' 
                            : 'bg-blue-100'
                        }`}>
                          <TypeIcon className={`w-6 h-6 ${
                            checklist.checklist_type === 'opening'
                              ? 'text-green-600'
                              : 'text-blue-600'
                          }`} />
                        </div>

                        <div>
                          <h3 className="font-bold text-lg capitalize">
                            {checklist.checklist_type} - {checklist.department.replace('_', ' ')}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {format(new Date(checklist.checklist_date), 'MMM d, yyyy')}
                            </span>
                            {checklist.assigned_staff?.[0] && (
                              <span>By: {checklist.assigned_staff[0].staff_name}</span>
                            )}
                            <Badge className="bg-blue-100 text-blue-800">
                              {checklist.completed_tasks}/{checklist.total_tasks} tasks
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => navigate(createPageUrl(`ActiveChecklist?id=${checklist.id}&view=true`))}
                          variant="outline"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedChecklist(checklist);
                            setShowDialog(true);
                          }}
                          className="bg-green-600"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Review
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Review Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Checklist</DialogTitle>
            </DialogHeader>
            {selectedChecklist && (
              <div className="space-y-4 mt-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold capitalize mb-2">
                    {selectedChecklist.checklist_type} - {selectedChecklist.department.replace('_', ' ')}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Completed by {selectedChecklist.assigned_staff?.[0]?.staff_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    on {format(new Date(selectedChecklist.completed_time), 'PPP')} at{' '}
                    {format(new Date(selectedChecklist.completed_time), 'p')}
                  </p>
                </div>

                <div>
                  <Label className="mb-2 block">Manager Notes (Optional)</Label>
                  <Textarea
                    value={managerNotes}
                    onChange={(e) => setManagerNotes(e.target.value)}
                    rows={3}
                    placeholder="Add any feedback or comments..."
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => verifyMutation.mutate({ 
                      id: selectedChecklist.id, 
                      approved: false 
                    })}
                    variant="outline"
                    className="flex-1 border-red-300 text-red-600"
                    disabled={verifyMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => verifyMutation.mutate({ 
                      id: selectedChecklist.id, 
                      approved: true 
                    })}
                    className="flex-1 bg-green-600"
                    disabled={verifyMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}