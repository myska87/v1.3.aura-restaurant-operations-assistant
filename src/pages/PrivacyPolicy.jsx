import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, Download, Home } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PrivacyPolicy() {
  // Get current privacy policy
  const { data: policy } = useQuery({
    queryKey: ['currentPrivacyPolicy'],
    queryFn: async () => {
      const policies = await base44.entities.LegalDocument.filter({
        document_type: 'privacy_policy',
        is_current: true
      });
      return policies[0] || null;
    },
  });

  const defaultPolicyContent = `
    <h2>Privacy Policy</h2>
    <p><strong>Effective Date:</strong> ${format(new Date(), 'MMMM d, yyyy')}</p>
    
    <h3>1. Introduction</h3>
    <p>Welcome to AURA One Pro. We are committed to protecting your personal data and respecting your privacy rights. This Privacy Policy explains how we collect, use, store, and protect your information.</p>
    
    <h3>2. Data Controller</h3>
    <p>AURA One Pro is the data controller responsible for your personal data.</p>
    
    <h3>3. What Data We Collect</h3>
    <ul>
      <li><strong>Personal Information:</strong> Name, email address, phone number</li>
      <li><strong>Employment Data:</strong> Position, department, hire date, shift schedules</li>
      <li><strong>Performance Data:</strong> Training records, performance reviews, coaching sessions</li>
      <li><strong>Attendance Data:</strong> Clock in/out times, locations (if GPS enabled)</li>
      <li><strong>Usage Data:</strong> How you interact with the app, pages visited, features used</li>
    </ul>
    
    <h3>4. How We Use Your Data</h3>
    <p>We use your personal data for:</p>
    <ul>
      <li>Managing your employment and work schedule</li>
      <li>Tracking attendance and performance</li>
      <li>Providing training and development</li>
      <li>Ensuring compliance with legal obligations</li>
      <li>Improving our services</li>
    </ul>
    
    <h3>5. Legal Basis for Processing</h3>
    <p>We process your data based on:</p>
    <ul>
      <li><strong>Contract:</strong> To fulfill our employment contract with you</li>
      <li><strong>Legal Obligation:</strong> To comply with employment law, tax requirements, etc.</li>
      <li><strong>Legitimate Interest:</strong> To improve our services and prevent fraud</li>
      <li><strong>Consent:</strong> Where you have given explicit consent</li>
    </ul>
    
    <h3>6. Data Retention</h3>
    <p>We retain your data for as long as necessary to fulfill the purposes outlined in this policy, or as required by law:</p>
    <ul>
      <li><strong>Employment Records:</strong> 6 years after employment ends (HMRC requirement)</li>
      <li><strong>Payroll Records:</strong> 6 years (UK tax law)</li>
      <li><strong>Training Records:</strong> 3 years</li>
      <li><strong>Audit Logs:</strong> 1 year</li>
    </ul>
    
    <h3>7. Your Rights Under GDPR</h3>
    <p>You have the following rights:</p>
    <ul>
      <li><strong>Right to Access:</strong> Request a copy of your personal data</li>
      <li><strong>Right to Rectification:</strong> Correct inaccurate data</li>
      <li><strong>Right to Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
      <li><strong>Right to Restrict Processing:</strong> Limit how we use your data</li>
      <li><strong>Right to Data Portability:</strong> Receive your data in a portable format</li>
      <li><strong>Right to Object:</strong> Object to processing based on legitimate interests</li>
      <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time</li>
    </ul>
    
    <h3>8. Data Security</h3>
    <p>We implement appropriate technical and organizational measures to protect your data:</p>
    <ul>
      <li>Encryption at rest and in transit (TLS 1.3)</li>
      <li>Access controls and authentication</li>
      <li>Regular security audits</li>
      <li>Employee training on data protection</li>
    </ul>
    
    <h3>9. Data Sharing</h3>
    <p>We do not sell your personal data. We may share data with:</p>
    <ul>
      <li><strong>Service Providers:</strong> Cloud hosting, email services (under strict contracts)</li>
      <li><strong>Legal Authorities:</strong> When required by law</li>
      <li><strong>Your Employer:</strong> If you use AURA through your workplace</li>
    </ul>
    
    <h3>10. International Transfers</h3>
    <p>Your data is stored within the UK/EU. If transferred outside, we ensure adequate safeguards are in place.</p>
    
    <h3>11. Cookies and Tracking</h3>
    <p>We use essential cookies for app functionality. You can control cookies through your browser settings.</p>
    
    <h3>12. Children's Privacy</h3>
    <p>AURA One Pro is not intended for users under 16. We do not knowingly collect data from children.</p>
    
    <h3>13. Changes to This Policy</h3>
    <p>We may update this policy from time to time. We will notify you of significant changes via email or app notification.</p>
    
    <h3>14. Contact Us</h3>
    <p>For privacy-related questions or to exercise your rights, contact:</p>
    <p><strong>Data Protection Officer</strong><br>
    Email: dpo@auraonepro.com<br>
    Address: [Your Business Address]</p>
    
    <h3>15. Supervisory Authority</h3>
    <p>You have the right to lodge a complaint with the UK Information Commissioner's Office (ICO):</p>
    <p>Website: <a href="https://ico.org.uk" target="_blank">https://ico.org.uk</a><br>
    Phone: 0303 123 1113</p>
    
    <hr>
    <p><em>Last Updated: ${format(new Date(), 'MMMM d, yyyy')}</em></p>
  `;

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Back Buttons */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("PrivacyCenter")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Privacy Center
            </Button>
          </Link>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Shield className="w-8 h-8 text-[#014D40]" />
              Privacy Policy
            </h1>
            {policy && (
              <p className="text-gray-600">
                Version {policy.version} • Effective {format(new Date(policy.effective_date), 'MMMM d, yyyy')}
              </p>
            )}
          </div>
          
          {policy?.pdf_url && (
            <a href={policy.pdf_url} download target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </a>
          )}
        </div>

        {/* Policy Content */}
        <Card className="bg-white border-none shadow-sm">
          <CardContent className="p-8 prose prose-slate max-w-none">
            <div 
              dangerouslySetInnerHTML={{ 
                __html: policy?.content_html || defaultPolicyContent 
              }}
            />
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link to={createPageUrl("PrivacyCenter")}>
            <Button className="bg-[#014D40] hover:bg-[#016854]">
              <Shield className="w-4 h-4 mr-2" />
              Manage Your Privacy Settings
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}