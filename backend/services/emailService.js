/**
 * AFTERWORD — RESEND EMAIL NOTIFICATION SERVICE
 * Manages transactional email dispatches for book donations, approvals, and rejections.
 */

const { Resend } = require('resend');

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

const resend = apiKey ? new Resend(apiKey) : null;

/**
 * Sends a generic email via Resend SDK
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject - Email subject
 * @param {string} params.html - Email HTML content
 * @param {string} [params.from] - Sender email address
 */
async function sendRawEmail({ to, subject, html, from = fromEmail }) {
  if (!resend) {
    console.error('[Resend Error] RESEND_API_KEY is missing in backend .env');
    return { success: false, error: 'RESEND_API_KEY is not configured in backend .env file.' };
  }

  if (!to || !to.includes('@')) {
    return { success: false, error: `Invalid recipient email address: "${to}"` };
  }

  try {
    const data = await resend.emails.send({
      from,
      to,
      subject,
      html
    });

    if (data && data.error) {
      const isTestRestriction = data.error.statusCode === 403 || 
        (data.error.message && data.error.message.includes('only send testing emails to your own email address'));

      const testRecipient = process.env.RESEND_TEST_RECIPIENT || 'rolandojrzagala38@gmail.com';

      if (isTestRestriction && to.toLowerCase() !== testRecipient.toLowerCase()) {
        console.warn(`[Resend Test Mode Redirect] Cannot send to "${to}" on free/unverified Resend domain. Redirecting test email to registered owner "${testRecipient}".`);
        
        const fallbackSubject = `[TEST FOR ${to}] ${subject}`;
        const fallbackHtml = `
          <div style="background-color: #fff3cd; border: 1px solid #ffeba2; padding: 12px; margin-bottom: 16px; border-radius: 6px; font-family: sans-serif; font-size: 13px; color: #856404;">
            <strong>Resend Test Mode Redirect Notice:</strong><br>
            This email was originally addressed to <code>${to}</code>, but was delivered to your registered owner address (<code>${testRecipient}</code>) because your Resend account is currently in test mode (using <code>onboarding@resend.dev</code>).
          </div>
          ${html}
        `;

        const retryData = await resend.emails.send({
          from,
          to: testRecipient,
          subject: fallbackSubject,
          html: fallbackHtml
        });

        if (retryData && !retryData.error) {
          console.log(`[Resend Email Redirected Successfully] Sent to owner (${testRecipient}) for intended recipient (${to}) | ID: ${retryData?.id}`);
          return { success: true, data: retryData, redirected: true, originalRecipient: to };
        }
      }

      console.error(`[Resend Delivery Failure for ${to}]:`, data.error);
      return { 
        success: false, 
        error: data.error.message || 'Resend API returned a delivery error.' 
      };
    }

    console.log(`[Resend Email Sent Successfully] Sent to: ${to} | ID: ${data?.id}`);
    return { success: true, data };
  } catch (err) {
    const isTestRestriction = err.message && err.message.includes('only send testing emails to your own email address');
    const testRecipient = process.env.RESEND_TEST_RECIPIENT || 'rolandojrzagala38@gmail.com';

    if (isTestRestriction && to.toLowerCase() !== testRecipient.toLowerCase()) {
      console.warn(`[Resend Test Mode Redirect] SDK Exception: Redirecting test email for "${to}" to registered owner "${testRecipient}".`);
      try {
        const retryData = await resend.emails.send({
          from,
          to: testRecipient,
          subject: `[TEST FOR ${to}] ${subject}`,
          html: `
            <div style="background-color: #fff3cd; border: 1px solid #ffeba2; padding: 12px; margin-bottom: 16px; border-radius: 6px; font-family: sans-serif; font-size: 13px; color: #856404;">
              <strong>Resend Test Mode Redirect Notice:</strong><br>
              Originally addressed to <code>${to}</code>.
            </div>
            ${html}
          `
        });
        return { success: true, data: retryData, redirected: true, originalRecipient: to };
      } catch (retryErr) {
        return { success: false, error: retryErr.message };
      }
    }

    console.error(`[Resend SDK Exception for ${to}]:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sends a Book Donation Approval email to the donor
 */
async function sendDonationApprovedEmail({ donorName, donorEmail, bookTitle, adminNote }) {
  const name = donorName || 'Reader';
  const title = bookTitle || 'your book';
  const noteSection = adminNote ? `
    <div style="background-color: #f4efe6; border-left: 3px solid #a65f45; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
      <strong style="color: #1c2b26; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Staff Note:</strong>
      <p style="margin: 4px 0 0; color: #2c3e35; font-size: 0.95rem;">${adminNote}</p>
    </div>
  ` : '';

  const html = `
    <div style="font-family: 'Georgia', serif; color: #1c2b26; background-color: #faf7f2; padding: 32px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #e5dfd5;">
      <div style="border-bottom: 2px solid #a65f45; padding-bottom: 12px; margin-bottom: 24px;">
        <h2 style="margin: 0; color: #1c2b26; font-family: 'Literata', Georgia, serif; font-size: 24px; tracking: -0.02em;">AFTERWORD</h2>
        <span style="color: #a65f45; font-size: 13px; font-style: italic; font-family: sans-serif;">Take your time.</span>
      </div>

      <p style="font-size: 16px; line-height: 1.6; color: #1c2b26;">Hi ${name},</p>
      
      <p style="font-size: 15px; line-height: 1.6; color: #2c3e35;">
        Thanks for offering <strong>"${title}"</strong> to the AFTERWORD Library.
      </p>

      <p style="font-size: 15px; line-height: 1.6; color: #2c3e35;">
        We've reviewed your donation request and would be happy to accept the book!
      </p>

      ${noteSection}

      <div style="background: #ffffff; padding: 16px; border-radius: 6px; border: 1px solid #dfd5c9; margin: 20px 0;">
        <p style="margin: 0 0 8px; font-weight: bold; color: #1c2b26; font-size: 14px;">Next Steps:</p>
        <p style="margin: 0; font-size: 14px; color: #555; line-height: 1.5;">
          Please bring the book to the AFTERWORD front counter when you visit so we can receive and process it into the collection. The book will officially become part of our library shelves after our team receives and processes it in person.
        </p>
      </div>

      <p style="font-size: 15px; line-height: 1.6; color: #2c3e35;">
        Thanks for helping us grow the library.
      </p>

      <p style="margin-top: 28px; font-size: 14px; color: #7f8c8d;">
        — AFTERWORD Community Team
      </p>
    </div>
  `;

  return sendRawEmail({
    to: donorEmail,
    subject: `Your AFTERWORD book donation was approved`,
    html
  });
}

/**
 * Sends a Book Donation Rejection email to the donor
 */
async function sendDonationRejectedEmail({ donorName, donorEmail, bookTitle, adminNote }) {
  const name = donorName || 'Reader';
  const title = bookTitle || 'your book';
  const noteSection = adminNote ? `
    <div style="background-color: #f4efe6; border-left: 3px solid #7f8c8d; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
      <strong style="color: #1c2b26; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Staff Note:</strong>
      <p style="margin: 4px 0 0; color: #2c3e35; font-size: 0.95rem;">${adminNote}</p>
    </div>
  ` : '';

  const html = `
    <div style="font-family: 'Georgia', serif; color: #1c2b26; background-color: #faf7f2; padding: 32px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #e5dfd5;">
      <div style="border-bottom: 2px solid #a65f45; padding-bottom: 12px; margin-bottom: 24px;">
        <h2 style="margin: 0; color: #1c2b26; font-family: 'Literata', Georgia, serif; font-size: 24px; tracking: -0.02em;">AFTERWORD</h2>
        <span style="color: #a65f45; font-size: 13px; font-style: italic; font-family: sans-serif;">Take your time.</span>
      </div>

      <p style="font-size: 16px; line-height: 1.6; color: #1c2b26;">Hi ${name},</p>

      <p style="font-size: 15px; line-height: 1.6; color: #2c3e35;">
        Thanks for offering <strong>"${title}"</strong> to the AFTERWORD Library.
      </p>

      <p style="font-size: 15px; line-height: 1.6; color: #2c3e35;">
        After reviewing the request, we're unable to accept this donation at this time.
      </p>

      ${noteSection}

      <p style="font-size: 15px; line-height: 1.6; color: #2c3e35;">
        Thanks again for thinking of AFTERWORD and supporting our community reading space.
      </p>

      <p style="margin-top: 28px; font-size: 14px; color: #7f8c8d;">
        — AFTERWORD Community Team
      </p>
    </div>
  `;

  return sendRawEmail({
    to: donorEmail,
    subject: `Update on your AFTERWORD book donation offer`,
    html
  });
}

module.exports = {
  sendRawEmail,
  sendDonationApprovedEmail,
  sendDonationRejectedEmail
};
