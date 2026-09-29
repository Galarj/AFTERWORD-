/**
 * AFTERWORD — Resend Email Notification Service
 * Integrates Resend API for transactional email notifications.
 */
const { Resend } = require('resend');

const apiKey = process.env.RESEND_API_KEY || '';
const resend = new Resend(apiKey);

/**
 * Sends an email via Resend API
 * @param {Object} options
 * @param {string} [options.to] - Target email recipient
 * @param {string} [options.subject] - Email subject line
 * @param {string} [options.html] - HTML email content
 * @param {string} [options.from] - Sender address
 */
async function sendEmail({
  to = 'rolandojrzagala38@gmail.com',
  subject = 'Hello World',
  html = '<p>Congrats on sending your <strong>first email</strong>!</p>',
  from = 'onboarding@resend.dev'
} = {}) {
  try {
    const data = await resend.emails.send({
      from,
      to,
      subject,
      html
    });

    if (data && data.error) {
      const testRecipient = process.env.RESEND_TEST_RECIPIENT || 'rolandojrzagala38@gmail.com';
      if (data.error.statusCode === 403 && to.toLowerCase() !== testRecipient.toLowerCase()) {
        console.warn(`[Resend Test Mode Redirect] Cannot send to ${to}. Redirecting to registered owner ${testRecipient}`);
        const retry = await resend.emails.send({
          from,
          to: testRecipient,
          subject: `[TEST FOR ${to}] ${subject}`,
          html: `<p><strong>Originally for: ${to}</strong></p>${html}`
        });
        return { success: true, data: retry, redirected: true };
      }
      return { success: false, error: data.error.message };
    }

    console.log('Resend email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    const testRecipient = process.env.RESEND_TEST_RECIPIENT || 'rolandojrzagala38@gmail.com';
    if (error.message && error.message.includes('only send testing emails') && to.toLowerCase() !== testRecipient.toLowerCase()) {
      console.warn(`[Resend Test Mode Redirect] Redirecting test email for ${to} to registered owner ${testRecipient}`);
      try {
        const retry = await resend.emails.send({
          from,
          to: testRecipient,
          subject: `[TEST FOR ${to}] ${subject}`,
          html: `<p><strong>Originally for: ${to}</strong></p>${html}`
        });
        return { success: true, data: retry, redirected: true };
      } catch (retryErr) {
        return { success: false, error: retryErr.message };
      }
    }
    console.error('Resend email delivery error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  resend,
  sendEmail
};
