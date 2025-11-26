/**
 * Email Service for Quote Workflow
 * 
 * Handles all email notifications for quote submission, approval, and rejection
 * Uses Resend for email delivery (can be swapped for other providers)
 */

// Email configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || 'orders@promosink.com';
const COMPANY_NAME = 'Promos Ink';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://portal.promosink.com';

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  cc?: string | string[];
  replyTo?: string;
}

/**
 * Send email using Resend API
 */
async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, skipping email send');
    console.log('Would have sent email:', {
      to: options.to,
      subject: options.subject,
    });
    return false;
  }
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${COMPANY_NAME} <${FROM_EMAIL}>`,
        to: Array.isArray(options.to) ? options.to : [options.to],
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
        reply_to: options.replyTo,
        subject: options.subject,
        html: options.html,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to send email:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

/**
 * Email: Quote Submitted (to customer)
 */
export async function sendQuoteSubmittedEmail(params: {
  customerEmail: string;
  customerName: string;
  quoteNumber: string;
  total: number;
}): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Quote Submitted!</h1>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi ${params.customerName},</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          Thank you for your quote request! Your quote has been submitted for approval by your account manager.
        </p>
        
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Quote Number:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600;">${params.quoteNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Estimated Total:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 18px; color: #3b82f6;">$${params.total.toFixed(2)}</td>
            </tr>
          </table>
        </div>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          <strong>What happens next?</strong>
        </p>
        
        <ol style="font-size: 15px; color: #475569; padding-left: 20px;">
          <li style="margin-bottom: 10px;">Your account manager will review your quote</li>
          <li style="margin-bottom: 10px;">Once approved, you'll receive an Order Acknowledgment email</li>
          <li style="margin-bottom: 10px;">Your order will be processed and production will begin</li>
        </ol>
        
        <p style="font-size: 16px; margin-top: 25px; margin-bottom: 20px;">
          You can view your quote status anytime:
        </p>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="${BASE_URL}/quotes/${params.quoteNumber}" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: 600;">View Quote</a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #64748b; margin: 0;">
          Questions? Reply to this email or contact your account manager.
        </p>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
        <p style="margin: 0;">${COMPANY_NAME}</p>
        <p style="margin: 5px 0 0 0;">Promotional Products & Apparel</p>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail({
    to: params.customerEmail,
    subject: `Quote ${params.quoteNumber} Submitted - Pending Approval`,
    html,
  });
}

/**
 * Email: Quote Approval Request (to account manager)
 */
export async function sendQuoteApprovalRequestEmail(params: {
  accountManagerEmail: string;
  customerName: string;
  quoteNumber: string;
  total: number;
  quoteId: string;
}): Promise<boolean> {
  // Generate approval link with token (in real implementation, get from database)
  const approvalUrl = `${BASE_URL}/admin/quotes/${params.quoteId}/review`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🔔 Quote Needs Approval</h1>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
          A new quote has been submitted and requires your approval:
        </p>
        
        <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #92400e;">Quote Number:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #92400e;">${params.quoteNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #92400e;">Customer:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #92400e;">${params.customerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #92400e;">Total:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 700; font-size: 20px; color: #b45309;">$${params.total.toFixed(2)}</td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${approvalUrl}" style="display: inline-block; background: #16a34a; color: white; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: 600; font-size: 16px; margin-right: 10px;">Review & Approve</a>
        </div>
        
        <p style="font-size: 14px; color: #64748b; text-align: center;">
          Or review in the <a href="${BASE_URL}/admin/quotes/pending" style="color: #3b82f6;">Quote Management Portal</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p style="font-size: 13px; color: #94a3b8; margin: 0; text-align: center;">
          This quote will expire in 30 days if not approved.
        </p>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail({
    to: params.accountManagerEmail,
    subject: `⏳ Quote ${params.quoteNumber} Needs Approval - ${params.customerName}`,
    html,
  });
}

/**
 * Email: Quote Approved (to customer)
 */
export async function sendQuoteApprovedEmail(params: {
  customerEmail: string;
  customerName: string;
  quoteNumber: string;
  total: number;
  approvedBy: string;
}): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">✅ Quote Approved!</h1>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi ${params.customerName},</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          Great news! Your quote has been approved by ${params.approvedBy}. Your order is now being processed.
        </p>
        
        <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #166534;">Quote Number:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #166534;">${params.quoteNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #166534;">Status:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #16a34a;">APPROVED ✓</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #166534;">Order Total:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 700; font-size: 20px; color: #16a34a;">$${params.total.toFixed(2)}</td>
            </tr>
          </table>
        </div>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          <strong>What happens next?</strong>
        </p>
        
        <ol style="font-size: 15px; color: #475569; padding-left: 20px;">
          <li style="margin-bottom: 10px;">You'll receive an Order Acknowledgment with full details</li>
          <li style="margin-bottom: 10px;">Production will begin shortly</li>
          <li style="margin-bottom: 10px;">We'll send tracking information once your order ships</li>
        </ol>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="${BASE_URL}/orders" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: 600;">View Orders</a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #64748b; margin: 0;">
          Thank you for your business!
        </p>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
        <p style="margin: 0;">${COMPANY_NAME}</p>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail({
    to: params.customerEmail,
    subject: `✅ Quote ${params.quoteNumber} Approved - Order Confirmed!`,
    html,
  });
}

/**
 * Email: Quote Rejected (to customer)
 */
export async function sendQuoteRejectedEmail(params: {
  customerEmail: string;
  customerName: string;
  quoteNumber: string;
  rejectionReason: string;
  accountManagerName: string;
  accountManagerEmail?: string;
}): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #64748b 0%, #475569 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Quote Update</h1>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi ${params.customerName},</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          We've reviewed your quote ${params.quoteNumber} and unfortunately we're unable to proceed at this time.
        </p>
        
        <div style="background: #f8fafc; border-left: 4px solid #64748b; padding: 15px 20px; margin: 25px 0;">
          <p style="margin: 0; font-size: 15px; color: #475569;">
            <strong>Reason:</strong><br>
            ${params.rejectionReason}
          </p>
        </div>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          Please don't hesitate to reach out if you have questions or would like to discuss alternatives.
        </p>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="${BASE_URL}/search" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: 600;">Start New Quote</a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #64748b; margin: 0;">
          Contact ${params.accountManagerName}${params.accountManagerEmail ? ` at ${params.accountManagerEmail}` : ''} with any questions.
        </p>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
        <p style="margin: 0;">${COMPANY_NAME}</p>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail({
    to: params.customerEmail,
    subject: `Quote ${params.quoteNumber} - Update from ${COMPANY_NAME}`,
    html,
  });
}

/**
 * Email: Order Acknowledgment (to customer, CC account manager)
 */
export async function sendOrderAcknowledgmentEmail(params: {
  customerEmail: string;
  customerName: string;
  quoteNumber: string;
  total: number;
  items: Array<{
    productName: string;
    styleNumber: string;
    colorName?: string | null;
    size: string;
    quantity: number;
    unitPrice: { toString(): string } | number;
    decorations?: unknown;
  }>;
  accountManagerEmail?: string;
  accountManagerName: string;
}): Promise<boolean> {
  // Build items table
  const itemsHtml = params.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
        <strong>${item.productName}</strong><br>
        <span style="color: #64748b; font-size: 13px;">${item.styleNumber} | ${item.colorName || 'N/A'} | ${item.size}</span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${Number(item.unitPrice).toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">$${(Number(item.unitPrice) * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 700px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📋 Order Acknowledgment</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0; font-size: 14px;">Order #${params.quoteNumber}</p>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi ${params.customerName},</p>
        
        <p style="font-size: 16px; margin-bottom: 25px;">
          Thank you for your order! This email confirms that your order has been received and is being processed.
        </p>
        
        <h2 style="font-size: 18px; color: #1e293b; margin-bottom: 15px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Order Details</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #475569;">Item</th>
              <th style="padding: 12px; text-align: center; font-weight: 600; color: #475569;">Qty</th>
              <th style="padding: 12px; text-align: right; font-weight: 600; color: #475569;">Unit</th>
              <th style="padding: 12px; text-align: right; font-weight: 600; color: #475569;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr style="background: #f0f9ff;">
              <td colspan="3" style="padding: 15px; text-align: right; font-weight: 600; font-size: 16px;">Order Total:</td>
              <td style="padding: 15px; text-align: right; font-weight: 700; font-size: 20px; color: #1e40af;">$${params.total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        
        <div style="background: #f0f9ff; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #1e40af;">Your Account Manager</h3>
          <p style="margin: 0; font-size: 15px;">
            ${params.accountManagerName}${params.accountManagerEmail ? `<br><a href="mailto:${params.accountManagerEmail}" style="color: #3b82f6;">${params.accountManagerEmail}</a>` : ''}
          </p>
        </div>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          <strong>What's next?</strong>
        </p>
        
        <ul style="font-size: 15px; color: #475569; padding-left: 20px;">
          <li style="margin-bottom: 8px;">Your order is now in production</li>
          <li style="margin-bottom: 8px;">You'll receive shipping confirmation with tracking</li>
          <li style="margin-bottom: 8px;">Contact your account manager with any questions</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${BASE_URL}/orders" style="display: inline-block; background: #1e40af; color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: 600;">Track Your Order</a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #64748b; margin: 0; text-align: center;">
          Thank you for choosing ${COMPANY_NAME}!
        </p>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
        <p style="margin: 0;">${COMPANY_NAME}</p>
        <p style="margin: 5px 0 0 0;">Promotional Products & Custom Apparel</p>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail({
    to: params.customerEmail,
    cc: params.accountManagerEmail,
    subject: `📋 Order Acknowledgment - ${params.quoteNumber}`,
    html,
  });
}

