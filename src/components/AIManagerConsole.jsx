/**
 * AURA AI Manager Console
 * "Hey AURA" - Voice and text-based AI assistant
 */

import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import CoreDB from './CoreDB';
import { Mic, Send, Loader2, Sparkles, Volume2, VolumeX } from 'lucide-react';

class AIAssistant {
  constructor() {
    this.conversationHistory = [];
    this.context = {};
  }

  async processCommand(userInput, user, context = {}) {
    console.log('[AIAssistant] Processing:', userInput);
    
    // Update context
    this.context = { ...this.context, ...context };
    
    // Add to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: userInput,
      timestamp: new Date().toISOString()
    });

    // Detect command intent
    const intent = this.detectIntent(userInput);
    
    // Execute command based on intent
    let response;
    try {
      response = await this.executeCommand(intent, userInput, user);
    } catch (error) {
      console.error('[AIAssistant] Command error:', error);
      response = {
        success: false,
        message: "I encountered an error processing that command. Please try again.",
        error: error.message
      };
    }

    // Add assistant response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: response.message,
      data: response.data,
      timestamp: new Date().toISOString()
    });

    return response;
  }

  detectIntent(input) {
    const lower = input.toLowerCase();
    
    // Hygiene & Compliance
    if (lower.includes('hygiene') || lower.includes('temperature') || lower.includes('compliance')) {
      if (lower.includes('score') || lower.includes('report') || lower.includes('show')) {
        return 'show_hygiene_score';
      }
      if (lower.includes('alert') || lower.includes('issue')) {
        return 'check_alerts';
      }
    }

    // Scheduling
    if (lower.includes('schedule') || lower.includes('shift') || lower.includes('rota')) {
      if (lower.includes('create') || lower.includes('add') || lower.match(/\d+\s+(chef|server|staff)/)) {
        return 'create_shifts';
      }
      if (lower.includes('show') || lower.includes('view') || lower.includes('what')) {
        return 'show_schedule';
      }
    }

    // Ordering
    if (lower.includes('order') || lower.includes('purchase') || lower.includes('buy')) {
      return 'create_order';
    }

    // Reporting
    if (lower.includes('report') && (lower.includes('send') || lower.includes('email') || lower.includes('audit'))) {
      return 'send_report';
    }

    // Staff management
    if (lower.includes('staff') || lower.includes('team') || lower.includes('employee')) {
      if (lower.includes('performance') || lower.includes('score')) {
        return 'staff_performance';
      }
      if (lower.includes('list') || lower.includes('show')) {
        return 'list_staff';
      }
    }

    // General query
    return 'general_query';
  }

  async executeCommand(intent, input, user) {
    switch (intent) {
      case 'show_hygiene_score':
        return await this.showHygieneScore();
      
      case 'check_alerts':
        return await this.checkAlerts();
      
      case 'create_shifts':
        return await this.createShifts(input, user);
      
      case 'show_schedule':
        return await this.showSchedule(input);
      
      case 'create_order':
        return await this.createOrder(input, user);
      
      case 'send_report':
        return await this.sendReport(input, user);
      
      case 'staff_performance':
        return await this.staffPerformance(input);
      
      case 'list_staff':
        return await this.listStaff(input);
      
      case 'general_query':
      default:
        return await this.handleGeneralQuery(input, user);
    }
  }

  async showHygieneScore() {
    const records = await base44.entities.HygieneRecord.list('-created_date', 100);
    const today = records.filter(r => {
      const age = (new Date() - new Date(r.created_date)) / (1000 * 60 * 60 * 24);
      return age <= 1;
    });

    const inRange = today.filter(r => r.is_in_range).length;
    const total = today.length;
    const score = total > 0 ? Math.round((inRange / total) * 100) : 0;

    const alerts = await base44.entities.HygieneAlertLog.filter({ status: 'open' });
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;

    let message = `📊 **Today's Hygiene Score: ${score}%**\n\n`;
    message += `✅ ${inRange} / ${total} temperature checks in safe range\n`;
    
    if (criticalAlerts > 0) {
      message += `\n⚠️ **${criticalAlerts} critical alert(s) need attention!**\n`;
    } else {
      message += `\n✨ No critical issues - excellent work!\n`;
    }

    return {
      success: true,
      message,
      data: { score, inRange, total, criticalAlerts }
    };
  }

  async checkAlerts() {
    const alerts = await base44.entities.HygieneAlertLog.filter({ status: 'open' });
    
    if (alerts.length === 0) {
      return {
        success: true,
        message: "✅ No open alerts - everything is running smoothly!",
        data: { alerts: [] }
      };
    }

    let message = `⚠️ **${alerts.length} Open Alert(s):**\n\n`;
    
    alerts.slice(0, 5).forEach((alert, i) => {
      message += `${i + 1}. ${alert.severity === 'critical' ? '🚨' : '⚠️'} ${alert.item_name} at ${alert.location}\n`;
      message += `   Temperature: ${alert.recorded_value}°C (Expected: ${alert.expected_range})\n\n`;
    });

    if (alerts.length > 5) {
      message += `...and ${alerts.length - 5} more.\n`;
    }

    return {
      success: true,
      message,
      data: { alerts }
    };
  }

  async createShifts(input, user) {
    // Extract details from input using AI
    const extractionPrompt = `Extract shift scheduling details from this request: "${input}"
    
    Return JSON with:
    - role: chef, server, bartender, etc
    - count: number of staff
    - date: YYYY-MM-DD format
    - shift_type: opening, mid_shift, or closing
    
    If not specified, use:
    - date: next Saturday
    - shift_type: mid_shift`;

    try {
      const extraction = await base44.integrations.Core.InvokeLLM({
        prompt: extractionPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            role: { type: "string" },
            count: { type: "number" },
            date: { type: "string" },
            shift_type: { type: "string" }
          }
        }
      });

      // Get available staff for that role
      const allStaff = await base44.entities.User.filter({ position: extraction.role });
      
      if (allStaff.length < extraction.count) {
        return {
          success: false,
          message: `❌ Only ${allStaff.length} ${extraction.role}(s) available, but you requested ${extraction.count}.`
        };
      }

      // Create shifts
      const shifts = [];
      for (let i = 0; i < extraction.count && i < allStaff.length; i++) {
        const staff = allStaff[i];
        const shift = await base44.entities.Shift.create({
          staff_email: staff.email,
          staff_name: staff.full_name,
          role: extraction.role,
          shift_date: extraction.date,
          shift_type: extraction.shift_type,
          start_time: extraction.shift_type === 'opening' ? '07:00' : extraction.shift_type === 'closing' ? '17:00' : '11:00',
          end_time: extraction.shift_type === 'opening' ? '15:00' : extraction.shift_type === 'closing' ? '23:00' : '19:00',
          status: 'scheduled'
        });
        shifts.push(shift);
      }

      return {
        success: true,
        message: `✅ Created ${shifts.length} ${extraction.role} shift(s) for ${extraction.date}!\n\nAssigned to:\n${shifts.map(s => `• ${s.staff_name}`).join('\n')}`,
        data: { shifts }
      };

    } catch (error) {
      return {
        success: false,
        message: "I couldn't understand the shift details. Try: 'Schedule 3 chefs for Saturday'"
      };
    }
  }

  async showSchedule(input) {
    const today = new Date().toISOString().split('T')[0];
    const shifts = await base44.entities.Shift.filter({ shift_date: today });

    if (shifts.length === 0) {
      return {
        success: true,
        message: "📅 No shifts scheduled for today.",
        data: { shifts: [] }
      };
    }

    let message = `📅 **Today's Schedule (${shifts.length} shifts):**\n\n`;
    
    const byRole = {};
    shifts.forEach(shift => {
      if (!byRole[shift.role]) byRole[shift.role] = [];
      byRole[shift.role].push(shift);
    });

    Object.entries(byRole).forEach(([role, roleShifts]) => {
      message += `**${role.toUpperCase()}** (${roleShifts.length}):\n`;
      roleShifts.forEach(s => {
        const status = s.status === 'in_progress' ? '🟢' : s.status === 'completed' ? '✅' : '⏰';
        message += `${status} ${s.staff_name}: ${s.start_time}-${s.end_time}\n`;
      });
      message += '\n';
    });

    return {
      success: true,
      message,
      data: { shifts }
    };
  }

  async createOrder(input, user) {
    // Extract ingredient and quantity using AI
    const extractionPrompt = `Extract order details from: "${input}"
    
    Return JSON with:
    - ingredient: name of ingredient
    - quantity: amount to order
    - supplier: supplier name if mentioned`;

    try {
      const extraction = await base44.integrations.Core.InvokeLLM({
        prompt: extractionPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            ingredient: { type: "string" },
            quantity: { type: "number" },
            supplier: { type: "string" }
          }
        }
      });

      // Find ingredient
      const ingredients = await base44.entities.Ingredient.list();
      const ingredient = ingredients.find(i => 
        i.name.toLowerCase().includes(extraction.ingredient.toLowerCase())
      );

      if (!ingredient) {
        return {
          success: false,
          message: `❌ Couldn't find ingredient "${extraction.ingredient}" in inventory.`
        };
      }

      // Create purchase order
      const supplier = await base44.entities.Supplier.filter({ id: ingredient.supplier_id });
      
      if (!supplier[0]) {
        return {
          success: false,
          message: `❌ No supplier configured for ${ingredient.name}`
        };
      }

      const lineTotal = extraction.quantity * ingredient.unit_cost;
      const tax = lineTotal * 0.2;
      
      const order = await base44.entities.PurchaseOrder.create({
        order_number: `PO-AI-${Date.now()}`,
        supplier_id: supplier[0].id,
        supplier_name: supplier[0].name,
        supplier_email: supplier[0].email,
        status: 'draft',
        items: [{
          ingredient_id: ingredient.id,
          ingredient_name: ingredient.name,
          quantity_ordered: extraction.quantity,
          unit: ingredient.unit,
          unit_cost: ingredient.unit_cost,
          line_total: lineTotal
        }],
        subtotal: lineTotal,
        tax: tax,
        total: lineTotal + tax,
        order_date: new Date().toISOString(),
        notes: 'Created via AI Assistant'
      });

      return {
        success: true,
        message: `✅ Created draft order for ${extraction.quantity} ${ingredient.unit} of ${ingredient.name} from ${supplier[0].name}\n\nTotal: £${(lineTotal + tax).toFixed(2)}\n\nCheck the Ordering page to review and send.`,
        data: { order }
      };

    } catch (error) {
      return {
        success: false,
        message: "I couldn't understand the order. Try: 'Order 50kg of milk from Supplier A'"
      };
    }
  }

  async sendReport(input, user) {
    // Extract recipient
    const extractionPrompt = `Extract report sending details from: "${input}"
    
    Return JSON with:
    - report_type: audit, compliance, hygiene, etc
    - recipient_email: email address if mentioned
    - recipient_name: name if mentioned`;

    try {
      const extraction = await base44.integrations.Core.InvokeLLM({
        prompt: extractionPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            report_type: { type: "string" },
            recipient_email: { type: "string" },
            recipient_name: { type: "string" }
          }
        }
      });

      // Generate report summary
      const records = await base44.entities.HygieneRecord.list('-created_date', 100);
      const score = records.length > 0 
        ? Math.round((records.filter(r => r.is_in_range).length / records.length) * 100)
        : 0;

      const reportContent = `AURA Audit Report
Generated: ${new Date().toLocaleString()}

Compliance Score: ${score}%
Total Records: ${records.length}
In Range: ${records.filter(r => r.is_in_range).length}

Status: ${score >= 90 ? 'EXCELLENT' : score >= 75 ? 'GOOD' : 'NEEDS IMPROVEMENT'}

---
Generated by AURA AI Assistant`;

      // Send email
      await base44.integrations.Core.SendEmail({
        to: extraction.recipient_email,
        subject: `AURA ${extraction.report_type} Report - ${new Date().toLocaleDateString()}`,
        body: reportContent
      });

      return {
        success: true,
        message: `✅ ${extraction.report_type} report sent to ${extraction.recipient_name || extraction.recipient_email}`,
        data: { report: reportContent }
      };

    } catch (error) {
      return {
        success: false,
        message: "I couldn't send the report. Try: 'Send audit report to naeem@example.com'"
      };
    }
  }

  async staffPerformance(input) {
    const performanceMetrics = await base44.entities.PerformanceMetric.list('-week_start', 10);
    
    if (performanceMetrics.length === 0) {
      return {
        success: true,
        message: "📊 No performance data available yet.",
        data: { metrics: [] }
      };
    }

    const topPerformers = performanceMetrics
      .sort((a, b) => b.final_score - a.final_score)
      .slice(0, 5);

    let message = `🏆 **Top 5 Performers This Week:**\n\n`;
    topPerformers.forEach((p, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      message += `${medal} ${p.staff_name}: ${p.final_score}/100\n`;
      message += `   Punctuality: ${p.punctuality_score}% | Tasks: ${p.task_completion_rate}%\n\n`;
    });

    return {
      success: true,
      message,
      data: { topPerformers }
    };
  }

  async listStaff(input) {
    const staff = await base44.entities.User.list();
    
    let message = `👥 **Team Directory (${staff.length} members):**\n\n`;
    
    const byPosition = {};
    staff.forEach(s => {
      if (!byPosition[s.position]) byPosition[s.position] = [];
      byPosition[s.position].push(s);
    });

    Object.entries(byPosition).forEach(([position, members]) => {
      message += `**${position?.toUpperCase() || 'STAFF'}** (${members.length}):\n`;
      members.forEach(m => {
        message += `• ${m.full_name} (${m.email})\n`;
      });
      message += '\n';
    });

    return {
      success: true,
      message,
      data: { staff }
    };
  }

  async handleGeneralQuery(input, user) {
    // Use AI to answer general questions about the system
    const context = `You are AURA, an AI assistant for restaurant operations management.
    
Current user: ${user?.full_name} (${user?.position})
Current date: ${new Date().toLocaleDateString()}

Available commands:
- Show hygiene score
- Check alerts
- Schedule shifts
- Create orders
- Send reports
- Show staff performance
- List team members

Answer the user's question helpfully and concisely.`;

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `${context}\n\nUser question: ${input}`,
      });

      return {
        success: true,
        message: response,
        data: null
      };
    } catch (error) {
      return {
        success: false,
        message: "I'm having trouble processing that. Try asking something like 'Show today's hygiene score' or 'Schedule 3 chefs for Saturday'."
      };
    }
  }
}

// Singleton instance
const aiAssistant = new AIAssistant();
export default aiAssistant;