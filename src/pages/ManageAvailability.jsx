import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Trash2, CheckCircle, XCircle, ArrowLeft, Home } from "lucide-react";
import { format, addDays } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ManageAvailability() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    is_available: true,
    preferred_shift_type: 'any',
    start_time: '09:00',
    end_time: '17:00',
    repeat_weekly: false,
    notes: '',
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: availability = [], isLoading } = useQuery({
    queryKey: ['myAvailability', user?.email],
    queryFn: () => base44.entities.Availability.filter({ staff_email: user?.email }, '-date'),
    enabled: !!user?.email,
  });

  const createAvailabilityMutation = useMutation({
    mutationFn: (data) => base44.entities.Availability.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAvailability'] });
      setShowForm(false);
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        is_available: true,
        preferred_shift_type: 'any',
        start_time: '09:00',
        end_time: '17:00',
        repeat_weekly: false,
        notes: '',
      });
    },
  });

  const deleteAvailabilityMutation = useMutation({
    mutationFn: (id) => base44.entities.Availability.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAvailability'] });
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const date = new Date(formData.date);
    const dayOfWeek = format(date, 'EEEE').toLowerCase();

    const data = {
      staff_email: user.email,
      staff_name: user.full_name,
      date: formData.date,
      day_of_week: dayOfWeek,
      is_available: formData.is_available,
      preferred_shift_type: formData.preferred_shift_type,
      start_time: formData.start_time,
      end_time: formData.end_time,
      repeat_weekly: formData.repeat_weekly,
      notes: formData.notes,
    };

    await createAvailabilityMutation.mutateAsync(data);

    // If repeat weekly, create for next 12 weeks
    if (formData.repeat_weekly) {
      for (let i = 1; i <= 12; i++) {
        const futureDate = addDays(date, i * 7);
        await createAvailabilityMutation.mutateAsync({
          ...data,
          date: format(futureDate, 'yyyy-MM-dd'),
          day_of_week: format(futureDate, 'EEEE').toLowerCase(),
        });
      }
    }
  };

  const getDayColor = (dayOfWeek) => {
    const colors = {
      monday: 'bg-blue-100 text-blue-800',
      tuesday: 'bg-green-100 text-green-800',
      wednesday: 'bg-purple-100 text-purple-800',
      thursday: 'bg-amber-100 text-amber-800',
      friday: 'bg-red-100 text-red-800',
      saturday: 'bg-indigo-100 text-indigo-800',
      sunday: 'bg-pink-100 text-pink-800',
    };
    return colors[dayOfWeek] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Back Buttons */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("StaffRota")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Shift & Rota
            </Button>
          </Link>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Availability</h1>
            <p className="text-gray-600">Set your available days and preferred shift times</p>
          </div>
          <Button 
            onClick={() => setShowForm(!showForm)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Availability
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="bg-white border-none shadow-lg mb-8">
            <CardHeader>
              <CardTitle>Set Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shift_type">Preferred Shift Type</Label>
                    <Select
                      value={formData.preferred_shift_type}
                      onValueChange={(value) => setFormData({ ...formData, preferred_shift_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any Shift</SelectItem>
                        <SelectItem value="opening">Opening Shift</SelectItem>
                        <SelectItem value="mid_shift">Mid-Shift</SelectItem>
                        <SelectItem value="closing">Closing Shift</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="start_time">Available From</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_time">Available Until</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="is_available"
                      checked={formData.is_available}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                    />
                    <Label htmlFor="is_available" className="cursor-pointer">
                      I am available on this date
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="repeat_weekly"
                      checked={formData.repeat_weekly}
                      onCheckedChange={(checked) => setFormData({ ...formData, repeat_weekly: checked })}
                    />
                    <Label htmlFor="repeat_weekly" className="cursor-pointer">
                      Repeat weekly for the next 3 months
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    placeholder="Any specific requirements or notes..."
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createAvailabilityMutation.isPending} className="bg-green-600 hover:bg-green-700">
                    Save Availability
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Availability List */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-gray-200 rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : availability.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="p-12 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No availability set yet</p>
                <p className="text-sm text-gray-400 mt-2">Add your available days to help with shift scheduling</p>
              </CardContent>
            </Card>
          ) : (
            availability.map((avail) => (
              <Card key={avail.id} className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {avail.is_available ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <h3 className="text-lg font-bold text-gray-900">
                          {format(new Date(avail.date), 'EEEE, MMMM d, yyyy')}
                        </h3>
                        <Badge className={getDayColor(avail.day_of_week)}>
                          {avail.day_of_week}
                        </Badge>
                        {avail.repeat_weekly && (
                          <Badge variant="outline">Repeats Weekly</Badge>
                        )}
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        <p>
                          Status: <span className={`font-medium ${avail.is_available ? 'text-green-600' : 'text-red-600'}`}>
                            {avail.is_available ? 'Available' : 'Unavailable'}
                          </span>
                        </p>
                        {avail.is_available && (
                          <>
                            <p>Time: {avail.start_time} - {avail.end_time}</p>
                            <p>Preferred: {avail.preferred_shift_type.replace('_', ' ')}</p>
                          </>
                        )}
                        {avail.notes && (
                          <p className="text-gray-500 italic mt-2">{avail.notes}</p>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Delete this availability entry?')) {
                          deleteAvailabilityMutation.mutate(avail.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}