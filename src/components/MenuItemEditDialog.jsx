
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Switch } from '@/components/ui/switch';
import { Save, X, Upload, Sparkles, Edit, ImageIcon } from 'lucide-react'; // Added Edit and ImageIcon as they are used in JSX
import { format } from 'date-fns'; // Added format import

export default function MenuItemEditDialog({ item, open, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    description: '',
    sell_price: '',
    prep_time_minutes: '',
    is_active: true,
    image_url: '',
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [suggestedSOPs, setSuggestedSOPs] = useState([]);

  const { data: categories = [] } = useQuery({
    queryKey: ['menuCategories'],
    queryFn: () => base44.entities.MenuCategory.list(),
  });

  const { data: sops = [] } = useQuery({
    queryKey: ['sops'],
    queryFn: () => base44.entities.SOPDocument.list(),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        category_id: item.category_id || '',
        description: item.description || '',
        sell_price: item.sell_price?.toString() || '',
        prep_time_minutes: item.prep_time_minutes?.toString() || '',
        is_active: item.is_active !== false,
        image_url: item.image_url || '',
      });

      // 🧠 Smart SOP Suggestions based on item name
      if (item.name) {
        const suggestions = sops.filter(sop => 
          sop.category === 'recipe' || 
          sop.category === 'kitchen' ||
          sop.title.toLowerCase().includes(item.name.toLowerCase())
        ).slice(0, 3);
        setSuggestedSOPs(suggestions);
      }
    }
  }, [item, sops]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MenuItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      queryClient.invalidateQueries({ queryKey: ['menuItem', item?.id] });
      onClose();
    },
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, image_url: file_url });
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    }
    setUploadingImage(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.category_id || !formData.sell_price) {
      alert('Please fill in all required fields');
      return;
    }

    const category = categories.find(c => c.id === formData.category_id);

    const updateData = {
      name: formData.name,
      category_id: formData.category_id,
      category_name: category?.name || 'Uncategorized',
      description: formData.description,
      sell_price: parseFloat(formData.sell_price),
      prep_time_minutes: formData.prep_time_minutes ? parseInt(formData.prep_time_minutes) : null,
      is_active: formData.is_active,
      image_url: formData.image_url,
    };

    await updateMutation.mutateAsync({ id: item.id, data: updateData });

    // 📝 LOG AUDIT TRAIL
    await base44.entities.ComplianceAudit.create({
      module_name: 'menu',
      action: 'update',
      action_description: `Edited menu item "${formData.name}" – updated details`,
      user_id: user?.id,
      user_email: user?.email,
      user_name: user?.full_name,
      target_entity: 'MenuItem',
      target_record_id: item.id,
      severity: 'info',
      changes_made: {
        before: {
          name: item.name,
          category_id: item.category_id,
          sell_price: item.sell_price,
          is_active: item.is_active,
        },
        after: updateData,
      },
    });
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Edit className="w-6 h-6 text-blue-600" />
            Edit Menu Item
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Dish Photo</Label>
            <div className="flex items-center gap-4">
              {formData.image_url ? (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200">
                  <img src={formData.image_url} alt="Dish" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, image_url: '' })}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('menu-photo-upload').click()}
                  disabled={uploadingImage}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingImage ? 'Uploading...' : 'Upload Photo'}
                </Button>
                <input
                  id="menu-photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sell_price">Sell Price (£) *</Label>
              <Input
                id="sell_price"
                type="number"
                step="0.01"
                value={formData.sell_price}
                onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prep_time">Prep Time (minutes)</Label>
              <Input
                id="prep_time"
                type="number"
                value={formData.prep_time_minutes}
                onChange={(e) => setFormData({ ...formData, prep_time_minutes: e.target.value })}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Brief description for the menu..."
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="is_active" className="text-base font-semibold">Active Status</Label>
              <p className="text-sm text-gray-600">Control if this item appears on the menu</p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          {/* 🧠 Smart SOP Suggestions */}
          {suggestedSOPs.length > 0 && !item.linked_sop_id && (
            <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
              <div className="flex items-start gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-purple-900">💡 Suggested SOPs for "{formData.name}"</h4>
                  <p className="text-sm text-purple-700">Link a preparation guide to maintain quality:</p>
                </div>
              </div>
              <div className="space-y-2">
                {suggestedSOPs.map(sop => (
                  <div key={sop.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-200">
                    <div>
                      <p className="font-medium text-gray-900">{sop.title}</p>
                      <p className="text-xs text-gray-600">{sop.category} • {sop.steps?.length || 0} steps</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-purple-700 border-purple-300 hover:bg-purple-100"
                      onClick={async () => {
                        // Auto-link this SOP
                        await base44.entities.MenuSOPLink.create({
                          menu_item_id: item.id,
                          menu_item_name: item.name,
                          sop_id: sop.id,
                          sop_title: sop.title,
                          sop_version: sop.version,
                          linked_by: (await base44.auth.me()).email,
                          linked_by_name: (await base44.auth.me()).full_name,
                          linked_at: new Date().toISOString(),
                          auto_update: true,
                        });
                        alert(`✅ "${sop.title}" linked successfully!`);
                      }}
                    >
                      Link
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
