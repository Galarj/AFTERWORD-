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

/**
 * Sends an Event RSVP Approved email to the patron
 */
async function sendRsvpApprovedEmail({ patronName, patronEmail, eventTitle, eventDate, eventTime, location, guestCount, adminNote }) {
  const name = patronName || 'Patron';
  const title = eventTitle || 'Community Gathering';
  const dateStr = eventDate ? new Date(eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Scheduled Date';
  const timeStr = eventTime || 'See event schedule';
  const locStr = location || 'AFTERWORD Community Gathering Space';
  const noteSection = adminNote ? `
    <div style="background-color: #f4efe6; border-left: 3px solid #a65f45; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
      <strong style="color: #1c2b26; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Staff Note:</strong>
      <p style="margin: 4px 0 0; color: #2c3e35; font-size: 0.95rem;">${adminNote}</p>
    </div>
  ` : '';

  const html = `
    <div style="font-family: 'Georgia', serif; color: #1c2b26; background-color: #faf7f2; padding: 32px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #e5dfd5;">
      <div style="border-bottom: 2px solid #a65f45; padding-bottom: 12px; margin-bottom: 24px;">
        <h2 style="margin: 0; color: #1c2b26; font-family: 'Literata', Georgia, serif; font-size: 24px;">AFTERWORD</h2>
        <span style="color: #a65f45; font-size: 13px; font-style: italic; font-family: sans-serif;">Community Gathering Space</span>
      </div>

      <p style="font-size: 16px; line-height: 1.6; color: #1c2b26;">Hi ${name},</p>
      
      <p style="font-size: 15px; line-height: 1.6; color: #2c3e35;">
        Great news! Your event reservation for <strong>"${title}"</strong> has been approved!
      </p>

      ${noteSection}

      <div style="background: #ffffff; padding: 20px; border-radius: 6px; border: 1px solid #dfd5c9; margin: 20px 0;">
        <h4 style="margin: 0 0 12px; color: #1c2b26; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 6px;">Reservation Details:</h4>
        <p style="margin: 4px 0; font-size: 14px; color: #444;"><strong>Event:</strong> ${title}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #444;"><strong>Date:</strong> ${dateStr}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #444;"><strong>Time:</strong> ${timeStr}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #444;"><strong>Location:</strong> ${locStr}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #444;"><strong>Seats Reserved:</strong> ${guestCount || 1} Guest(s)</p>
        <p style="margin: 4px 0; font-size: 14px; color: #2e7d32;"><strong>Reservation Status:</strong> Confirmed ✓</p>
      </div>

      <p style="font-size: 15px; line-height: 1.6; color: #2c3e35;">
        You can view your confirmed reservation anytime on your profile dashboard. We look forward to seeing you at the gathering!
      </p>

      <p style="margin-top: 28px; font-size: 14px; color: #7f8c8d;">
        — AFTERWORD Community Team
      </p>
    </div>
  `;

  return sendRawEmail({
    to: patronEmail,
    subject: `RSVP Approved: ${title}`,
    html
  });
}

/**
 * Sends an Event RSVP Rejection email to the patron
 */
async function sendRsvpRejectedEmail({ patronName, patronEmail, eventTitle, adminNote }) {
  const name = patronName || 'Patron';
  const title = eventTitle || 'Community Gathering';
  const noteSection = adminNote ? `
    <div style="background-color: #f4efe6; border-left: 3px solid #7f8c8d; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
      <strong style="color: #1c2b26; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Staff Note:</strong>
      <p style="margin: 4px 0 0; color: #2c3e35; font-size: 0.95rem;">${adminNote}</p>
    </div>
  ` : '';

  const html = `
    <div style="font-family: 'Georgia', serif; color: #1c2b26; background-color: #faf7f2; padding: 32px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #e5dfd5;">
      <div style="border-bottom: 2px solid #a65f45; padding-bottom: 12px; margin-bottom: 24px;">
        <h2 style="margin: 0; color: #1c2b26; font-family: 'Literata', Georgia, serif; font-size: 24px;">AFTERWORD</h2>
        <span style="color: #a65f45; font-size: 13px; font-style: italic; font-family: sans-serif;">Community Gathering Space</span>
      </div>

      <p style="font-size: 16px; line-height: 1.6; color: #1c2b26;">Hi ${name},</p>

      <p style="font-size: 15px; line-height: 1.6; color: #2c3e35;">
        Regarding your reservation request for <strong>"${title}"</strong>:
      </p>

      <p style="font-size: 15px; line-height: 1.6; color: #2c3e35;">
        We're unable to confirm your reservation for this gathering at this time due to venue capacity constraints.
      </p>

      ${noteSection}

      <p style="font-size: 15px; line-height: 1.6; color: #2c3e35;">
        Please feel free to check our event schedule for upcoming workshops and future dates!
      </p>

      <p style="margin-top: 28px; font-size: 14px; color: #7f8c8d;">
        — AFTERWORD Community Team
      </p>
    </div>
  `;

  return sendRawEmail({
    to: patronEmail,
    subject: `Update on your reservation for ${title}`,
    html
  });
}

/**
 * Sends a Floral Stem Bar / Custom Bouquet Confirmation Email via Resend API
 */
async function sendFloralOrderEmail({ patronName, patronEmail, phone, itemsSummary, wrapStyle, pickupTime, notes, totalAmount }) {
  const name = patronName || 'Flower Enthusiast';
  const email = patronEmail;
  const items = itemsSummary || 'Custom Stem Arrangement';
  const wrap = wrapStyle || 'Standard Unbleached Kraft Paper';
  const pickup = pickupTime || 'Counter Pickup';
  const total = typeof totalAmount === 'number' ? `₱${totalAmount.toFixed(2)}` : totalAmount;

  const html = `
    <div style="font-family: 'Georgia', serif; color: #1c2b26; background-color: #faf7f2; padding: 32px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #e5dfd5;">
      <div style="border-bottom: 2px solid #a65f45; padding-bottom: 12px; margin-bottom: 24px;">
        <h2 style="margin: 0; color: #1c2b26; font-family: 'Literata', Georgia, serif; font-size: 24px;">AFTERWORD</h2>
        <span style="color: #a65f45; font-size: 13px; font-style: italic; font-family: sans-serif;">Botanical Floral Studio &amp; Stem Bar</span>
      </div>

      <p style="font-size: 16px; line-height: 1.6; color: #1c2b26;">Hi ${name},</p>
      
      <p style="font-size: 15px; line-height: 1.6; color: #2c3e35;">
        Thank you for your custom bouquet order at the <strong>AFTERWORD DIY Stem Bar</strong>!
      </p>

      <div style="background: #ffffff; padding: 20px; border-radius: 6px; border: 1px solid #dfd5c9; margin: 20px 0;">
        <h4 style="margin: 0 0 12px; color: #1c2b26; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 6px;">Bespoke Bouquet Summary:</h4>
        <p style="margin: 6px 0; font-size: 14px; color: #444;"><strong>Selected Stems:</strong> ${items}</p>
        <p style="margin: 6px 0; font-size: 14px; color: #444;"><strong>Vessel / Wrapping:</strong> ${wrap}</p>
        <p style="margin: 6px 0; font-size: 14px; color: #444;"><strong>Pickup / Table #:</strong> ${pickup}</p>
        ${phone ? `<p style="margin: 6px 0; font-size: 14px; color: #444;"><strong>Contact Phone:</strong> ${phone}</p>` : ''}
        ${notes ? `<p style="margin: 6px 0; font-size: 14px; color: #444;"><strong>Card Note / Ribbon:</strong> "${notes}"</p>` : ''}
        <p style="margin: 12px 0 0; font-size: 16px; color: #a65f45; font-weight: bold;"><strong>Total Calculated:</strong> ${total}</p>
      </div>

      <p style="font-size: 15px; line-height: 1.6; color: #2c3e35;">
        Our barista and florist are crafting your floral arrangement with fresh morning cuts and ribbon. You can pick it up at the floral counter!
      </p>

      <p style="margin-top: 28px; font-size: 14px; color: #7f8c8d;">
        — AFTERWORD Botanical Team
      </p>
    </div>
  `;

  return sendRawEmail({
    to: email,
    subject: `Your AFTERWORD Custom Floral Order Confirmation`,
    html
  });
}

/**
 * Sends a Café Table Reservation Confirmation Email via Resend API
 */
async function sendTableReservationEmail({ patronName, patronEmail, tableNumber, reservationDate, startTime, guestCount, location, specialRequests }) {
  const name = patronName || 'Guest';
  const table = tableNumber || 'T01';
  const dateStr = reservationDate ? new Date(reservationDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Scheduled Date';
  const timeStr = startTime || '5:00 PM';
  const guests = guestCount || 2;
  const area = location || 'AFTERWORD Café Main Floor';

  const html = `
    <div style="font-family: 'Georgia', serif; color: #1c2b26; background-color: #faf7f2; padding: 32px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #e5dfd5;">
      <div style="border-bottom: 2px solid #a65f45; padding-bottom: 12px; margin-bottom: 24px;">
        <h2 style="margin: 0; color: #1c2b26; font-family: 'Literata', Georgia, serif; font-size: 24px;">AFTERWORD</h2>
        <span style="color: #a65f45; font-size: 13px; font-style: italic; font-family: sans-serif;">Café Table Reservation Confirmation</span>
      </div>

      <p style="font-size: 16px; line-height: 1.6; color: #1c2b26;">Hi ${name},</p>
      
      <p style="font-size: 15px; line-height: 1.6; color: #2c3e35;">
        Your table reservation at <strong>AFTERWORD Café</strong> has been confirmed!
      </p>

      <div style="background: #ffffff; padding: 20px; border-radius: 6px; border: 1px solid #dfd5c9; margin: 20px 0;">
        <h4 style="margin: 0 0 12px; color: #1c2b26; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 6px;">Reservation Details:</h4>
        <p style="margin: 6px 0; font-size: 14px; color: #444;"><strong>Table Number:</strong> ${table}</p>
        <p style="margin: 6px 0; font-size: 14px; color: #444;"><strong>Location / Area:</strong> ${area}</p>
        <p style="margin: 6px 0; font-size: 14px; color: #444;"><strong>Date:</strong> ${dateStr}</p>
        <p style="margin: 6px 0; font-size: 14px; color: #444;"><strong>Time Slot:</strong> ${timeStr}</p>
        <p style="margin: 6px 0; font-size: 14px; color: #444;"><strong>Guest Count:</strong> ${guests} Guests</p>
        ${specialRequests ? `<p style="margin: 6px 0; font-size: 14px; color: #444;"><strong>Special Notes:</strong> "${specialRequests}"</p>` : ''}
        <p style="margin: 12px 0 0; font-size: 14px; color: #2e7d32; font-weight: bold;">Status: Confirmed ✓</p>
      </div>

      <p style="font-size: 15px; line-height: 1.6; color: #2c3e35;">
        We look forward to hosting you. Please check in with our barista counter when you arrive.
      </p>

      <p style="margin-top: 28px; font-size: 14px; color: #7f8c8d;">
        — AFTERWORD Café &amp; Reading Room Team
      </p>
    </div>
  `;

  return sendRawEmail({
    to: patronEmail,
    subject: `Table Reserved: ${table} on ${reservationDate}`,
    html
  });
}

module.exports = {
  sendRawEmail,
  sendDonationApprovedEmail,
  sendDonationRejectedEmail,
  sendRsvpApprovedEmail,
  sendRsvpRejectedEmail,
  sendFloralOrderEmail,
  sendTableReservationEmail
};
