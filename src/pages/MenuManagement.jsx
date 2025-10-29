
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ChefHat, Camera, Image as ImageIcon, Folder, Calculator, ShoppingCart, ArrowLeft, Home } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const safeNumber = (value, decimals = 2, fallback = 0) => {
  const num = parseFloat(value);
  if (isNaN(num) || num === null || num === undefined) return fallback;
  return parseFloat(num.toFixed(decimals));
};

const formatPrice = (price) => {
  return `£${safeNumber(price, 2).toFixed(2)}`;
};

const formatPercent = (percent) => {
  return safeNumber(percent, 1).toFixed(1);
};

export default function MenuManagement() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Menu Management</h1>
      <p>Menu management page is loading...</p>
    </div>
  );
}
