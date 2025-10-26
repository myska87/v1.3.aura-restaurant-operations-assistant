
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Truck, ChefHat, BarChart3, ArrowRight, Warehouse, ShoppingCart, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

const inventoryModules = [
  {
    title: "Stock Management",
    description: "Track inventory with automated reordering when stock runs low",
    icon: Warehouse,
    url: createPageUrl("InventoryManagement"),
    color: "from-emerald-500 to-emerald-600",
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    title: "Menu Management",
    description: "Create menu items with recipes, photos, and cost calculations",
    icon: ChefHat,
    url: createPageUrl("MenuManagement"),
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    title: "Menu Analysis",
    description: "Profitability metrics, food cost percentages, and menu optimization",
    icon: BarChart3,
    url: createPageUrl("MenuAnalysis"),
    color: "from-amber-500 to-amber-600",
    bgColor: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    title: "Shopping Cart & Orders",
    description: "Create draft orders and manage your shopping basket",
    icon: ShoppingCart,
    url: createPageUrl("Ordering"),
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    title: "Order History",
    description: "View past orders, track deliveries, and manage receipts",
    icon: FileText,
    url: createPageUrl("OrderHistory"),
    color: "from-indigo-500 to-indigo-600",
    bgColor: "bg-indigo-50",
    iconColor: "text-indigo-600",
  },
  {
    title: "Suppliers",
    description: "Manage supplier contacts, pricing, and ingredient relationships",
    icon: Truck,
    url: createPageUrl("SupplierManagement"),
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-50",
    iconColor: "text-green-600",
  },
];

export default function Inventory() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Inventory Management
          </h1>
          <p className="text-lg text-gray-600">
            Comprehensive tools for stock control, menu costing, and supplier management
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {inventoryModules.map((module, index) => {
            const Icon = module.icon;
            return (
              <motion.div
                key={module.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Link to={module.url}>
                  <Card className="bg-white border-none shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
                    <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                    
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className={`p-4 ${module.bgColor} rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className={`w-8 h-8 ${module.iconColor}`} />
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-300" />
                      </div>
                    </CardHeader>

                    <CardContent>
                      <CardTitle className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                        {module.title}
                      </CardTitle>
                      <p className="text-gray-600 leading-relaxed">
                        {module.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
