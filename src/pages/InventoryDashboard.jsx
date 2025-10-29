import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, BarChart3, Settings } from 'lucide-react';
import InventoryManagement from './InventoryManagement';
import IngredientStock from './IngredientStock';
import SupplierManagement from './SupplierManagement';
import Ordering from './Ordering';
import OrderHistory from './OrderHistory';
import ProductionPlanning from './ProductionPlanning';
import MenuAnalysis from './MenuAnalysis';

export default function InventoryDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Package className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Inventory Hub</h1>
                <p className="text-gray-600">Stock control, suppliers, and menu costing</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="manage" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Manage
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <InventoryManagement />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <MenuAnalysis />
            </TabsContent>

            <TabsContent value="manage" className="space-y-6">
              <Tabs defaultValue="ingredients" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
                  <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
                  <TabsTrigger value="ordering">Orders</TabsTrigger>
                  <TabsTrigger value="production">Production</TabsTrigger>
                </TabsList>

                <TabsContent value="ingredients">
                  <IngredientStock />
                </TabsContent>

                <TabsContent value="suppliers">
                  <SupplierManagement />
                </TabsContent>

                <TabsContent value="ordering">
                  <div className="space-y-6">
                    <Ordering />
                    <OrderHistory />
                  </div>
                </TabsContent>

                <TabsContent value="production">
                  <ProductionPlanning />
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}