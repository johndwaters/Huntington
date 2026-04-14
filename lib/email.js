import nodemailer from 'nodemailer';

const BRAND = {
  yellow: '#FFD100',
  black: '#1a1a1a',
  darkGray: '#333333',
  medGray: '#555555',
  lightGray: '#f4f4f4',
  white: '#ffffff',
  red: '#c0392b',
  orange: '#e67e22',
  green: '#27ae60',
  purple: '#8e44ad',
};

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error('MISSING_GMAIL_CREDENTIALS: GMAIL_USER or GMAIL_APP_PASSWORD not found in environment variables.');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass,
    },
  });
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

// ── Send Email ──
export async function sendEmail(to, subject, htmlBody, senderName = 'One Hour Heating & Air', cc = []) {
  const transporter = getTransporter();

  const mailOptions = {
    from: `"${senderName}" <${process.env.GMAIL_USER}>`,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html: htmlBody,
    headers: {
      'List-Unsubscribe': `<mailto:${process.env.GMAIL_USER}?subject=unsubscribe>`,
      'Precedence': 'bulk'
    }
  };

  if (cc && (Array.isArray(cc) ? cc.length > 0 : cc)) {
    mailOptions.cc = Array.isArray(cc) ? cc.join(', ') : cc;
  }

  const info = await transporter.sendMail(mailOptions);
  return info;
}

// ── URL Builder ──
export function buildResponseUrl(token, action) {
  return `${getAppUrl()}/respond/${token}?action=${action}`;
}

// ── Footer ──
function footer() {
  return `<div style="background:${BRAND.yellow};padding:8px 30px;text-align:center;">
    <p style="margin:0;font-size:12px;color:${BRAND.black};font-weight:bold;">ONE HOUR HEATING &amp; AIR</p>
  </div>
  <div style="text-align:center;padding:20px;">
    <p style="margin:0;font-size:11px;color:#999;">
      This is an automated request. To stop receiving these alerts, please 
      <a href="mailto:${process.env.GMAIL_USER}?subject=unsubscribe" style="color:#666;text-decoration:underline;">Unsubscribe</a>.
    </p>
  </div>`;
}

// ── Monthly Reminder Email ──
export function buildReminderEmailHtml(bodyText, month, token, followUpNumber) {
  const headerBg = followUpNumber ? BRAND.orange : BRAND.black;
  const headerText = followUpNumber ? BRAND.white : BRAND.yellow;
  const headerLabel = followUpNumber
    ? `Follow-up Reminder #${followUpNumber}`
    : 'Monthly Status Check';

  const noUrl = buildResponseUrl(token, 'no');
  const maybeUrl = buildResponseUrl(token, 'maybe');
  const yesUrl = buildResponseUrl(token, 'yes');

  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:${BRAND.lightGray};margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.1);">
    <div style="background:${headerBg};padding:25px 30px;">
      <h1 style="color:${headerText};margin:0;font-size:20px;">${headerLabel}</h1>
      <p style="color:rgba(255,255,255,.6);margin:5px 0 0;font-size:14px;">${month}</p>
    </div>
    <div style="padding:30px;">
      <p style="color:${BRAND.darkGray};font-size:15px;line-height:1.6;">${bodyText}</p>
      <p style="color:${BRAND.medGray};font-size:14px;margin-top:20px;">Please select the current status — <strong>your response is sent to the whole team:</strong></p>
        <a href="${noUrl}" style="display:inline-block;background:${BRAND.green};color:white;padding:14px 22px;text-decoration:none;border-radius:6px;font-size:15px;font-weight:bold;margin:6px;">Yes — Funds Good</a>
        <a href="${maybeUrl}" style="display:inline-block;background:${BRAND.orange};color:white;padding:14px 22px;text-decoration:none;border-radius:6px;font-size:15px;font-weight:bold;margin:6px;">Maybe</a>
        <a href="${yesUrl}" style="display:inline-block;background:${BRAND.red};color:white;padding:14px 22px;text-decoration:none;border-radius:6px;font-size:15px;font-weight:bold;margin:6px;">No — Funds are Low</a>
      </div>
      <p style="color:#aaa;font-size:11px;text-align:center;">Clicking any button will instantly record your response and notify the team.</p>
    </div>
    ${footer()}
  </div>
</body>
</html>`;
}

// ── Final Check Email ──
export function buildFinalCheckEmailHtml(month, priorResponse, token, customBodyText) {
  const noUrl = buildResponseUrl(token, 'no');
  const maybeUrl = buildResponseUrl(token, 'maybe');
  const yesUrl = buildResponseUrl(token, 'yes');

  const bodyContent = customBodyText
    ? `<p style="color:#333;font-size:15px;line-height:1.6;">${customBodyText}</p>`
    : `<p style="color:#333;font-size:15px;line-height:1.6;">We're 5 days from the end of the month. Please reconfirm (or update) the overall status before the upcoming payment is due.</p>`;

  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:${BRAND.lightGray};margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.1);">
    <div style="background:${BRAND.purple};padding:25px 30px;">
      <h1 style="color:white;margin:0;font-size:20px;">Final Month-End Reconfirmation</h1>
      <p style="color:rgba(255,255,255,.7);margin:5px 0 0;font-size:14px;">${month} — 5 days remaining</p>
    </div>
    <div style="padding:30px;">
      ${bodyContent}
      <div style="background:#f8f9fa;border-radius:6px;padding:14px 18px;margin:20px 0;">
        <p style="margin:0;color:${BRAND.medGray};font-size:14px;"><strong>Your prior response on file:</strong></p>
        <p style="margin:8px 0 0;font-size:15px;">${formatPriorResponse(priorResponse)}</p>
      </div>
      <p style="color:${BRAND.medGray};font-size:14px;">Has anything changed? Please reconfirm — <strong>your response notifies the whole team:</strong></p>
      <div style="text-align:center;margin:30px 0;">
        <a href="${noUrl}" style="display:inline-block;background:${BRAND.green};color:white;padding:14px 22px;text-decoration:none;border-radius:6px;font-size:15px;font-weight:bold;margin:6px;">Yes — Still Good</a>
        <a href="${maybeUrl}" style="display:inline-block;background:${BRAND.orange};color:white;padding:14px 22px;text-decoration:none;border-radius:6px;font-size:15px;font-weight:bold;margin:6px;">Now Uncertain</a>
        <a href="${yesUrl}" style="display:inline-block;background:${BRAND.red};color:white;padding:14px 22px;text-decoration:none;border-radius:6px;font-size:15px;font-weight:bold;margin:6px;">No — Funds are Low</a>
      </div>
      <p style="color:#aaa;font-size:11px;text-align:center;">Clicking any button will instantly record your response and notify the team.</p>
    </div>
    ${footer()}
  </div>
</body>
</html>`;
}

function formatPriorResponse(r) {
  if (r === 'YES') return 'No — Funds are low';
  if (r === 'MAYBE') return 'Maybe — Uncertain';
  if (r === 'NO') return 'Yes — Funds are good';
  return 'No response received yet';
}

// ── Notification Emails (sent to all recipients after a response) ──
export function buildNotificationSubject(responseType, month, isFinal) {
  const tag = isFinal ? '[FINAL CHECK] ' : '';
  if (responseType === 'YES') return `${tag}Funds are Low — ${month}`;
  if (responseType === 'MAYBE') return `${tag}Status Uncertain — ${month}`;
  return `${tag}Funds are Good — ${month}`;
}

export function buildNotificationEmailHtml(responseType, month, message, isFinal) {
  if (responseType === 'YES') return buildYesNotification(month, message, isFinal);
  if (responseType === 'MAYBE') return buildMaybeNotification(month, message, isFinal);
  return buildNoNotification(month, isFinal);
}

function buildYesNotification(month, message, isFinal) {
  const tag = isFinal ? ' — Final Re-check' : '';
  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:${BRAND.lightGray};margin:0;padding:20px;">
  <div style="max-width:580px;margin:0 auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.1);">
    <div style="background:${BRAND.red};padding:25px 30px;">
      <h1 style="color:white;margin:0;font-size:20px;">Funds are Low${tag}</h1>
      <p style="color:#fadbd8;margin:5px 0 0;font-size:14px;">${month}</p>
    </div>
    <div style="padding:30px;">
      <p style="color:${BRAND.darkGray};font-size:15px;line-height:1.6;">The office manager has indicated that <strong>funds are low</strong> for next month's payment.</p>
      <div style="background:#fdf2f2;border-left:4px solid ${BRAND.red};padding:15px 20px;margin:20px 0;border-radius:0 6px 6px 0;">
        <strong style="color:${BRAND.red};">Notes:</strong>
        <p style="margin:8px 0 0;color:${BRAND.medGray};">${message || '(no notes)'}</p>
      </div>
      <p style="color:${BRAND.medGray};font-size:14px;">Please coordinate as action may be needed before the payment date.</p>
    </div>
    ${footer()}
  </div>
</body>
</html>`;
}

function buildMaybeNotification(month, message, isFinal) {
  const tag = isFinal ? ' — Final Re-check' : '';
  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:${BRAND.lightGray};margin:0;padding:20px;">
  <div style="max-width:580px;margin:0 auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.1);">
    <div style="background:${BRAND.orange};padding:25px 30px;">
      <h1 style="color:white;margin:0;font-size:20px;">Status Uncertain${tag}</h1>
      <p style="color:#fdebd0;margin:5px 0 0;font-size:14px;">${month}</p>
    </div>
    <div style="padding:30px;">
      <p style="color:${BRAND.darkGray};font-size:15px;line-height:1.6;">The office manager is <strong>currently uncertain</strong> of the overall status for next month's payment. Please monitor closely.</p>
      <div style="background:#fef9e7;border-left:4px solid ${BRAND.orange};padding:15px 20px;margin:20px 0;border-radius:0 6px 6px 0;">
        <strong style="color:#d68910;">Notes:</strong>
        <p style="margin:8px 0 0;color:${BRAND.medGray};">${message || '(no notes)'}</p>
      </div>
      <p style="color:${BRAND.medGray};font-size:14px;">Stay alert for a follow-up update as the month progresses.</p>
    </div>
    ${footer()}
  </div>
</body>
</html>`;
}

function buildNoNotification(month, isFinal) {
  const tag = isFinal ? ' — Final Re-check' : '';
  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:${BRAND.lightGray};margin:0;padding:20px;">
  <div style="max-width:580px;margin:0 auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.1);">
    <div style="background:${BRAND.green};padding:25px 30px;">
      <h1 style="color:white;margin:0;font-size:20px;">Funds are Good${tag}</h1>
      <p style="color:#d5f5e3;margin:5px 0 0;font-size:14px;">${month}</p>
    </div>
    <div style="padding:30px;">
      <p style="color:${BRAND.darkGray};font-size:15px;line-height:1.6;">The office manager has confirmed the status is sufficient. <strong>Funds are good</strong> for next month's payment.</p>
      <p style="color:${BRAND.medGray};font-size:14px;">No action required at this time.</p>
    </div>
    ${footer()}
  </div>
</body>
</html>`;
}

// ── Final Check Notification (sent to all when final check is dispatched) ──
export function buildFinalCheckNotificationHtml(month, priorResponse) {
  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:${BRAND.lightGray};margin:0;padding:20px;">
  <div style="max-width:580px;margin:0 auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.1);">
    <div style="background:${BRAND.black};padding:25px 30px;">
      <h1 style="color:${BRAND.yellow};margin:0;font-size:20px;">Final Re-Check Sent</h1>
      <p style="color:#999;margin:5px 0 0;font-size:14px;">${month}</p>
    </div>
    <div style="padding:30px;">
      <p style="color:${BRAND.darkGray};font-size:15px;">A final reconfirmation request has been sent to the office manager with 5 days remaining in the month.</p>
      <p style="color:${BRAND.medGray};font-size:14px;"><strong>Prior response on file:</strong> ${formatPriorResponse(priorResponse)}</p>
      <p style="color:${BRAND.medGray};font-size:14px;">You will receive another notification once she reconfirms.</p>
    </div>
    ${footer()}
  </div>
</body>
</html>`;
}
