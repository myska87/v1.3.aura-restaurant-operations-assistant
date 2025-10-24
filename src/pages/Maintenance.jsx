import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Camera, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export default function Maintenance() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "equipment",
    location: "",
    priority: "medium",
    photo_urls: [],
  });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['maintenanceTickets'],
    queryFn: () => base44.entities.MaintenanceTicket.list("-created_date"),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const createTicketMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceTicket.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceTickets'] });
      setShowForm(false);
      setFormData({
        title: "",
        description: "",
        category: "equipment",
        location: "",
        priority: "medium",
        photo_urls: [],
      });
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceTicket.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceTickets'] });
    },
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        photo_urls: [...prev.photo_urls, file_url]
      }));
    } catch (error) {
      console.error("Error uploading photo:", error);
    }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createTicketMutation.mutateAsync({
      ...formData,
      status: "open",
      reported_by: user?.full_name || user?.email,
    });
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    await updateTicketMutation.mutateAsync({
      id: ticketId,
      data: { status: newStatus }
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Maintenance (ROTOS)</h1>
            <p className="text-gray-600">Report and track repair & operational tasks</p>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Report Issue
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Report Maintenance Issue</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Issue Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Brief description of the issue"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Detailed Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide more details about the issue..."
                    rows={4}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="plumbing">Plumbing</SelectItem>
                        <SelectItem value="electrical">Electrical</SelectItem>
                        <SelectItem value="hvac">HVAC</SelectItem>
                        <SelectItem value="structural">Structural</SelectItem>
                        <SelectItem value="cleaning">Cleaning</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData({ ...formData, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Where is the issue located?"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Photos</Label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('ticket-photo-upload').click()}
                      disabled={uploading}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Add Photos'}
                    </Button>
                    <input
                      id="ticket-photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    {formData.photo_urls.length > 0 && (
                      <span className="text-sm text-gray-600">
                        {formData.photo_urls.length} photo(s) added
                      </span>
                    )}
                  </div>
                  {formData.photo_urls.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {formData.photo_urls.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt="Issue"
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createTicketMutation.isPending}>
                    {createTicketMutation.isPending ? 'Submitting...' : 'Submit Ticket'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tickets List */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-gray-200 rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : tickets.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">No maintenance tickets</p>
              </CardContent>
            </Card>
          ) : (
            tickets.map((ticket) => (
              <Card key={ticket.id} className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {ticket.priority === 'urgent' && (
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        )}
                        <h3 className="font-semibold text-lg text-gray-900">{ticket.title}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {ticket.priority} priority
                        </Badge>
                        <Badge className={getStatusColor(ticket.status)}>
                          {ticket.status.replace(/_/g, ' ')}
                        </Badge>
                        <Badge variant="outline">
                          {ticket.category}
                        </Badge>
                      </div>
                      <p className="text-gray-700 mb-3">{ticket.description}</p>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Location: {ticket.location}</p>
                        <p>Reported by: {ticket.reported_by}</p>
                        <p>Date: {format(new Date(ticket.created_date), "PPp")}</p>
                      </div>
                    </div>
                    {ticket.photo_urls?.length > 0 && (
                      <div className="flex gap-2 ml-4">
                        {ticket.photo_urls.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt="Issue"
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={ticket.status}
                      onValueChange={(value) => handleStatusChange(ticket.id, value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="awaiting_parts">Awaiting Parts</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
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