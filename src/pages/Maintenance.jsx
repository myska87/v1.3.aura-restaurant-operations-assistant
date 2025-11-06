import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Wrench,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  Camera,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';

export default function Maintenance() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'equipment',
    location: '',
    priority: 'medium',
    photo_urls: [],
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['maintenanceTickets'],
    queryFn: () => base44.entities.MaintenanceTicket.list('-created_date'),
  });

  const createTicketMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceTicket.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceTickets'] });
      setShowForm(false);
      setFormData({
        title: '',
        description: '',
        category: 'equipment',
        location: '',
        priority: 'medium',
        photo_urls: [],
      });
    },
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData({
      ...formData,
      photo_urls: [...formData.photo_urls, file_url],
    });
    setUploadingPhoto(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createTicketMutation.mutateAsync({
      ...formData,
      reported_by: user?.email,
      status: 'open',
    });
  };

  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress');
  const closedTickets = tickets.filter(t => t.status === 'completed' || t.status === 'cancelled');

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-amber-100 text-amber-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Wrench className="w-8 h-8 text-blue-600" />
              Maintenance
            </h1>
            <p className="text-gray-600">Report and track maintenance issues</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Report Issue
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <Card key={i} className="bg-white">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Open Tickets */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Open Issues ({openTickets.length})
              </h2>
              {openTickets.length === 0 ? (
                <Card className="bg-white">
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-600">No open maintenance issues</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {openTickets.map(ticket => (
                    <Card
                      key={ticket.id}
                      className="bg-white hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                            <h3 className="font-bold text-gray-900">{ticket.title}</h3>
                          </div>
                          <Badge className={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{ticket.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="capitalize">{ticket.category}</span>
                          <span>•</span>
                          <span>{ticket.location}</span>
                        </div>
                        <div className="mt-3 pt-3 border-t flex items-center justify-between">
                          <Badge variant="outline" className={
                            ticket.status === 'in_progress' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'
                          }>
                            {ticket.status === 'in_progress' ? 'In Progress' : 'Open'}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {format(new Date(ticket.created_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Closed Tickets */}
            {closedTickets.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Completed Issues ({closedTickets.length})
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {closedTickets.slice(0, 6).map(ticket => (
                    <Card
                      key={ticket.id}
                      className="bg-white hover:shadow-lg transition-shadow cursor-pointer opacity-75"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-bold text-gray-900">{ticket.title}</h3>
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-1">{ticket.description}</p>
                        <div className="mt-3 text-xs text-gray-500">
                          Completed {format(new Date(ticket.completed_date || ticket.updated_date), 'MMM d')}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create Ticket Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Report Maintenance Issue</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Issue Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Oven not heating properly"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
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
                  <Label>Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Main Kitchen, Prep Area"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  placeholder="Describe the issue in detail..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Photos (Optional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('maintenance-photo').click()}
                  disabled={uploadingPhoto}
                  className="w-full"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {uploadingPhoto ? 'Uploading...' : `Add Photo${formData.photo_urls.length > 0 ? ` (${formData.photo_urls.length})` : ''}`}
                </Button>
                <input
                  id="maintenance-photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                {formData.photo_urls.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {formData.photo_urls.map((url, i) => (
                      <div key={i} className="relative w-20 h-20 rounded border">
                        <img src={url} alt="Issue" className="w-full h-full object-cover rounded" />
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            photo_urls: formData.photo_urls.filter((_, idx) => idx !== i)
                          })}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTicketMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                  Submit Report
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Ticket Details Dialog */}
        <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="max-w-2xl">
            {selectedTicket && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Wrench className="w-5 h-5" />
                    {selectedTicket.title}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="flex gap-2">
                    <Badge className={getPriorityColor(selectedTicket.priority)}>
                      {selectedTicket.priority} Priority
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {selectedTicket.category}
                    </Badge>
                    <Badge variant="outline">
                      {selectedTicket.location}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Description:</p>
                    <p className="text-gray-900">{selectedTicket.description}</p>
                  </div>

                  {selectedTicket.photo_urls && selectedTicket.photo_urls.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Photos:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedTicket.photo_urls.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt={`Issue ${i + 1}`}
                            className="w-full h-40 object-cover rounded-lg"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t text-sm text-gray-600">
                    <p>Reported: {format(new Date(selectedTicket.created_date), 'PPp')}</p>
                    {selectedTicket.completed_date && (
                      <p>Completed: {format(new Date(selectedTicket.completed_date), 'PPp')}</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}