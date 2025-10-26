import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  FileDown,
  ArrowLeft,
  ShieldAlert,
  Eye,
  FileSpreadsheet,
  FileText,
  AlertTriangle
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

// Allergen icons
const allergenIcons = {
  milk: "🥛",
  nuts: "🥜",
  gluten: "🌾",
  soy: "🌱",
  egg: "🥚",
  fish: "🐟",
  shellfish: "🦐",
  sesame: "◉",
  celery: "🥬",
  mustard: "🌼",
  sulphites: "🍷",
  lupin: "🫘"
};

const riskColors = {
  none: "bg-green-100 text-green-800",
  low: "bg-blue-100 text-blue-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800"
};

export default function AllergyTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { data: allergyRecords = [], isLoading } = useQuery({
    queryKey: ['allergyRecords'],
    queryFn: () => base44.entities.AllergyRecord.list('-last_synced'),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['menuCategories'],
    queryFn: () => base44.entities.MenuCategory.list(),
  });

  const handleExportCSV = () => {
    const headers = ['Item Name', 'Category', 'Allergens', 'Risk Level', 'Last Updated'];
    const rows = filteredRecords.map(record => [
      record.menu_item_name,
      record.category,
      record.allergens_detected.join(', '),
      record.risk_level,
      record.last_synced ? format(new Date(record.last_synced), 'dd/MM/yyyy HH:mm') : 'Never'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `allergy-table-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const handleExportPDF = async () => {
    const content = `
AURA ONE PRO - ALLERGY INFORMATION TABLE
Generated: ${format(new Date(), 'dd MMMM yyyy HH:mm')}
===============================================

${filteredRecords.map(record => `
${record.menu_item_name} (${record.category})
Allergens: ${record.allergens_detected.join(', ') || 'None detected'}
Risk Level: ${record.risk_level.toUpperCase()}
Last Synced: ${record.last_synced ? format(new Date(record.last_synced), 'dd/MM/yyyy HH:mm') : 'Never'}
---
`).join('\n')}

===============================================
This document is auto-generated and reflects the current menu allergen information.
For compliance purposes, verify with kitchen staff before service.

Signature: _________________________
Date: _____________________________
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `allergy-table-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();

    alert('✅ Allergy table exported! For PDF format, please print this file to PDF.');
  };

  const handleViewDetails = (record) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  // Filter records
  const filteredRecords = allergyRecords.filter(record => {
    const matchesSearch = record.menu_item_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || record.category === filterCategory;
    const matchesRisk = filterRisk === "all" || record.risk_level === filterRisk;
    
    return matchesSearch && matchesCategory && matchesRisk;
  });

  // Sort by risk level (high first)
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    const riskOrder = { high: 0, medium: 1, low: 2, none: 3 };
    return riskOrder[a.risk_level] - riskOrder[b.risk_level];
  });

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <ShieldAlert className="w-8 h-8 text-amber-600" />
              Allergy Information Table
            </h1>
            <p className="text-gray-600">Auto-generated allergen tracking for menu compliance</p>
          </div>
          <div className="flex gap-3">
            <Link to={createPageUrl("Menu")}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Menu
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileText className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900">{allergyRecords.length}</div>
              <div className="text-sm text-gray-600">Total Items</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {allergyRecords.filter(r => r.risk_level === 'high').length}
              </div>
              <div className="text-sm text-gray-600">High Risk</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-amber-600">
                {allergyRecords.filter(r => r.risk_level === 'medium').length}
              </div>
              <div className="text-sm text-gray-600">Medium Risk</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {allergyRecords.filter(r => r.allergens_detected.length === 0).length}
              </div>
              <div className="text-sm text-gray-600">Allergen Free</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white border-none shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterRisk} onValueChange={setFilterRisk}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk Levels</SelectItem>
                  <SelectItem value="high">🔴 High Risk</SelectItem>
                  <SelectItem value="medium">🟡 Medium Risk</SelectItem>
                  <SelectItem value="low">🔵 Low Risk</SelectItem>
                  <SelectItem value="none">🟢 No Allergens</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="bg-white border-none shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading allergy data...</p>
              </div>
            ) : sortedRecords.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No allergy records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="text-left p-4 font-semibold text-gray-700">Item Name</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Category</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Allergens</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Risk Level</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Last Updated</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRecords.map((record, index) => (
                      <tr
                        key={record.id}
                        className={`border-b hover:bg-gray-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        <td className="p-4">
                          <div className="font-medium text-gray-900">{record.menu_item_name}</div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline">{record.category}</Badge>
                        </td>
                        <td className="p-4">
                          {record.allergens_detected.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {record.allergens_detected.map(allergen => (
                                <Badge key={allergen} variant="outline" className="text-xs">
                                  {allergenIcons[allergen]} {allergen}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">None detected</span>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge className={riskColors[record.risk_level]}>
                            {record.risk_level.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {record.last_synced ? format(new Date(record.last_synced), 'dd/MM/yyyy HH:mm') : 'Never'}
                        </td>
                        <td className="p-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(record)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Modal */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                Allergen Details: {selectedRecord?.menu_item_name}
              </DialogTitle>
            </DialogHeader>

            {selectedRecord && (
              <div className="space-y-6 mt-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Category</h3>
                  <Badge variant="outline">{selectedRecord.category}</Badge>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Risk Level</h3>
                  <Badge className={riskColors[selectedRecord.risk_level]}>
                    {selectedRecord.risk_level.toUpperCase()}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Allergens Detected</h3>
                  {selectedRecord.allergens_detected.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedRecord.allergens_detected.map(allergen => (
                        <Badge key={allergen} variant="outline" className="text-base py-2 px-3">
                          {allergenIcons[allergen]} {allergen}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No allergens detected</p>
                  )}
                </div>

                {selectedRecord.ingredient_sources && selectedRecord.ingredient_sources.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Ingredient Sources</h3>
                    <div className="space-y-2">
                      {selectedRecord.ingredient_sources.map((source, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <p className="font-medium text-gray-900">{source.ingredient_name}</p>
                          <p className="text-sm text-gray-600">
                            Contains: {source.allergens.map(a => allergenIcons[a] + ' ' + a).join(', ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Last Synced</h3>
                  <p className="text-gray-600">
                    {selectedRecord.last_synced ? format(new Date(selectedRecord.last_synced), 'PPpp') : 'Never'}
                  </p>
                </div>

                {selectedRecord.auto_generated && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      ℹ️ This record was automatically generated from ingredient data.
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}