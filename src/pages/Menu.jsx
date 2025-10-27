import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChefHat, BarChart3, Utensils, ArrowRight, Calculator, ShieldAlert, Sparkles, Edit } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

const menuModules = [
  {
    title: "Menu Management",
    description: "Create and edit menu items, recipes, pricing, and photos",
    icon: ChefHat,
    url: createPageUrl("MenuManagement"),
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    title: "Menu Analysis",
    description: "Analyze profitability, food costs, and menu performance",
    icon: BarChart3,
    url: createPageUrl("MenuAnalysis"),
    color: "from-amber-500 to-amber-600",
    bgColor: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    title: "Allergen Compliance",
    description: "Automatic allergen tracking and EHO compliance",
    icon: ShieldAlert,
    url: createPageUrl("AllergyTable"),
    color: "from-red-500 to-red-600",
    bgColor: "bg-red-50",
    iconColor: "text-red-600",
  },
  {
    title: "🤖 Menu Intelligence",
    description: "AI-powered menu optimization and recommendations",
    icon: Sparkles,
    url: createPageUrl("MenuIntelligence"),
    color: "from-indigo-500 to-indigo-600",
    bgColor: "bg-indigo-50",
    iconColor: "text-indigo-600",
  },
];

export default function Menu() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg">
              <Utensils className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                🍽️ Menu Management
              </h1>
              <p className="text-lg text-gray-600 mt-1">
                Comprehensive menu tools - from creation to analysis
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {menuModules.map((module, index) => {
            const Icon = module.icon;
            return (
              <motion.div
                key={module.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Link to={module.url}>
                  <Card className="bg-white border-none shadow-lg hover:shadow-2xl transition-all duration-300 group overflow-hidden relative h-full">
                    <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                    
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-4 ${module.bgColor} rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className={`w-8 h-8 ${module.iconColor}`} />
                        </div>
                        <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-2 transition-all duration-300" />
                      </div>

                      <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                        {module.title}
                      </h3>
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

        {/* Quick Stats */}
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border-2 border-blue-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calculator className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">💡 Menu Pro Tips</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Keep food cost below 35% for optimal profitability</li>
                <li>• Update allergen information after any recipe changes</li>
                <li>• Use Menu Intelligence for AI-powered optimization</li>
                <li>• Link SOPs to menu items for consistent preparation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}