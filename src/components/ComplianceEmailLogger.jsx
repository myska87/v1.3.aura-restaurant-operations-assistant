import { base44 } from "@/api/base44Client";

/**
 * ComplianceCore Email Logger
 * Utility for logging email activities for GDPR compliance
 * Use this when sending emails through any system
 */

export const logEmailSent = async ({
  emailType = 'other',
  relatedEntity = null,
  relatedRecordId = null,
  recipientEmail,
  recipientName = null,
  ccEmails = [],
  bccEmails = [],
  subject,
  bodyPreview = '',
  containsPersonalData = false,
  sentBy,
  sentVia = 'system',
  deliveryStatus = 'sent',
  gmailMessageId = null,
  gmailThreadId = null,
  attachments = [],
}) => {
  try {
    await base44.entities.ComplianceEmailLog.create({
      email_type: emailType,
      related_entity: relatedEntity,
      related_record_id: relatedRecordId,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      cc_emails: ccEmails,
      bcc_emails: bccEmails,
      subject: subject,
      body_preview: bodyPreview.substring(0, 200),
      contains_personal_data: containsPersonalData,
      sent_by_user_id: sentBy.id,
      sent_by_email: sentBy.email,
      sent_by_name: sentBy.full_name,
      sent_via: sentVia,
      sent_at: new Date().toISOString(),
      delivery_status: deliveryStatus,
      gmail_message_id: gmailMessageId,
      gmail_thread_id: gmailThreadId,
      attachments: attachments,
      user_consented: true, // Assume consent for business emails
    });
    
    console.log('✅ ComplianceCore: Email logged successfully');
  } catch (error) {
    console.error('❌ ComplianceCore: Failed to log email', error);
  }
};

export const updateEmailDeliveryStatus = async (emailLogId, status, deliveredAt = null) => {
  try {
    await base44.entities.ComplianceEmailLog.update(emailLogId, {
      delivery_status: status,
      delivered_at: deliveredAt || new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ ComplianceCore: Failed to update email status', error);
  }
};

export const logEmailOpened = async (emailLogId) => {
  try {
    await base44.entities.ComplianceEmailLog.update(emailLogId, {
      opened_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ ComplianceCore: Failed to log email open', error);
  }
};

export const logEmailClicked = async (emailLogId) => {
  try {
    await base44.entities.ComplianceEmailLog.update(emailLogId, {
      clicked_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ ComplianceCore: Failed to log email click', error);
  }
};

/**
 * Gmail OAuth Integration Helper
 * Use this to send emails via Gmail API
 */
export const sendViaGmail = async (emailData, user) => {
  // This would integrate with Gmail API in production
  // For now, just log the intent
  
  console.log('📧 ComplianceCore: Preparing Gmail send...', emailData);
  
  try {
    // Log the email first
    await logEmailSent({
      emailType: emailData.type || 'other',
      relatedEntity: emailData.relatedEntity,
      relatedRecordId: emailData.relatedRecordId,
      recipientEmail: emailData.to,
      recipientName: emailData.toName,
      ccEmails: emailData.cc || [],
      bccEmails: emailData.bcc || [],
      subject: emailData.subject,
      bodyPreview: emailData.body,
      containsPersonalData: emailData.containsPII || false,
      sentBy: user,
      sentVia: 'gmail',
      deliveryStatus: 'pending',
      attachments: emailData.attachments || [],
    });

    // In production, this would call Gmail API
    // const gmail = await getGmailClient();
    // const result = await gmail.users.messages.send({...});
    
    return {
      success: true,
      messageId: `mock_${Date.now()}`,
      message: 'Email logged (Gmail OAuth integration pending)',
    };
  } catch (error) {
    console.error('❌ ComplianceCore: Gmail send failed', error);
    return {
      success: false,
      error: error.message,
    };
  }
};