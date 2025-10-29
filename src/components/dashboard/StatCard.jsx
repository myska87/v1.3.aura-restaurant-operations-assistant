import React from 'react';
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function StatCard({ title, value, subtitle, icon: Icon, color, trend, link }) {
  const cardContent = (
    <Card className={`relative overflow-hidden bg-white border-none shadow-sm transition-all duration-300 ${link ? 'hover:shadow-xl hover:scale-105 cursor-pointer' : 'hover:shadow-md'}`}>
      <div className={`absolute top-0 right-0 w-32 h-32 ${color} opacity-5 rounded-full transform translate-x-12 -translate-y-12`} />
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
          </div>
          <div className={`p-3 ${color} bg-opacity-10 rounded-xl`}>
            <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
          </div>
        </div>
        {subtitle && (
          <p className="text-sm text-gray-600">{subtitle}</p>
        )}
        {trend && (
          <div className={`text-sm font-medium mt-2 ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </div>
        )}
        {link && (
          <div className="flex items-center gap-2 mt-3 text-sm font-medium text-blue-600 group-hover:text-blue-700">
            <span>View details</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        )}
      </div>
    </Card>
  );

  if (link) {
    return (
      <Link to={link} className="block group">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {cardContent}
        </motion.div>
      </Link>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {cardContent}
    </motion.div>
  );
}