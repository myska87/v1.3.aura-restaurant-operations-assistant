import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Sparkles, Loader2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function AIComplianceSummary() {
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState(null);

  const { data: sops = [] } = useQuery({
    queryKey: ['sopDocuments'],
    queryFn: () => base44.entities.SOPDocument.list(),
  });

  const { data: audits = [] } = useQuery({
    queryKey: ['auditReports'],
    queryFn: () => base44.entities.AuditReport.list(),
  });

  const { data: certifications = [] } = useQuery({
    queryKey: ['complianceDocuments'],
    queryFn: () => base44.entities.ComplianceDocument.list(),
  });

  const generateComplianceReport = async () => {
    setGenerating(true);

    try {
      const prompt = `Generate a professional compliance summary report based on this restaurant data:

SOPs: ${sops.length} standard operating procedures
- ${sops.filter(s => s.status === 'active').length} active
- Categories: ${[...new Set(sops.map(s => s.category))].join(', ')}

Audit Reports: ${audits.length} total audits
- Average Score: ${audits.length > 0 ? (audits.reduce((sum, a) => sum + a.overall_score, 0) / audits.length).toFixed(1) : 0}%
- Latest: ${audits[0]?.audit_title || 'None'}

Compliance Certificates: ${certifications.length} documents
- ${certifications.filter(c => c.status === 'active').length} active
- ${certifications.filter(c => c.status === 'expiring_soon').length} expiring soon

Please provide:
1. Overall compliance status (Excellent/Good/Needs Attention)
2. Key strengths (2-3 points)
3. Areas for improvement (2-3 points)
4. Recommended next steps (3-5 action items)
5. Compliance score (0-100)

Format as a professional executive summary.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            compliance_score: { type: 'number' },
            strengths: { type: 'array', items: { type: 'string' } },
            improvements: { type: 'array', items: { type: 'string' } },
            next_steps: { type: 'array', items: { type: 'string' } },
            summary: { type: 'string' }
          }
        }
      });

      setSummary(result);
    } catch (error) {
      console.error('Error generating summary:', error);
      alert('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const downloadPDF = () => {
    alert('PDF export functionality - would integrate with PDF generation library');
  };

  return (
    <Card className="shadow-lg border-2 border-emerald-200">
      <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6" />
            AI Compliance Report Generator
          </CardTitle>
          {summary && (
            <Button
              onClick={downloadPDF}
              variant="secondary"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        
        {!summary ? (
          <div className="text-center py-8">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-6">
              Generate a comprehensive compliance report combining SOPs, audits, and certifications
            </p>
            <Button
              onClick={generateComplianceReport}
              disabled={generating}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate AI Report
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Compliance Status</h3>
                <p className="text-gray-600">Generated {format(new Date(), 'MMMM d, yyyy • h:mm a')}</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 mb-1">Compliance Score</div>
                <div className="text-5xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  {summary.compliance_score}%
                </div>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200">
              <h4 className="text-xl font-bold text-emerald-900 mb-3">{summary.status}</h4>
              <p className="text-gray-700 leading-relaxed">{summary.summary}</p>
            </div>

            {/* Strengths */}
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Key Strengths
              </h4>
              <ul className="space-y-2">
                {summary.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Improvements */}
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                Areas for Improvement
              </h4>
              <ul className="space-y-2">
                {summary.improvements.map((improvement, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Next Steps */}
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Recommended Next Steps
              </h4>
              <ul className="space-y-2">
                {summary.next_steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">
                      {idx + 1}
                    </div>
                    <span className="text-gray-700">{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setSummary(null)}>
                Generate New Report
              </Button>
              <Button onClick={downloadPDF} className="bg-emerald-600 hover:bg-emerald-700">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}