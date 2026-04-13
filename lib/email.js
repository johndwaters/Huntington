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
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

// ── Send Email ──
export async function sendEmail(to, subject, htmlBody, senderName = 'One Hour Heating & Air') {
  const transporter = getTransporter();

  const info = await transporter.sendMail({
    from: `"${senderName}" <${process.env.GMAIL_USER}>`,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html: htmlBody,
  });

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
  </div>`;
}

// ── Monthly Reminder Email ──
export function buildReminderEmailHtml(bodyText, month, token, followUpNumber) {
  const headerBg = followUpNumber ? BRAND.orange : BRAND.black;
  const headerText = followUpNumber ? BRAND.white : BRAND.yellow;
  const headerLabel = followUpNumber
    ? `Follow-up Reminder #${followUpNumber}`
    : 'Monthly Bank Account Status Check';

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
      <div style="text-align:center;margin:30px 0;">
        <a href="${noUrl}" style="display:inline-block;background:${BRAND.green};color:white;padding:14px 22px;text-decoration:none;border-radius:6px;font-size:15px;font-weight:bold;margin:6px;">No — We're Good</a>
        <a href="${maybeUrl}" style="display:inline-block;background:${BRAND.orange};color:white;padding:14px 22px;text-decoration:none;border-radius:6px;font-size:15px;font-weight:bold;margin:6px;">Maybe — Not Sure Yet</a>
        <a href="${yesUrl}" style="display:inline-block;background:${BRAND.red};color:white;padding:14px 22px;text-decoration:none;border-radius:6px;font-size:15px;font-weight:bold;margin:6px;">Yes — Need Credit Line Pull</a>
      </div>
      <p style="color:#aaa;font-size:11px;text-align:center;">Clicking Yes or Maybe will ask you for a required note before notifying the team.</p>
    </div>
    ${footer()}
  </div>
</body>
</html>`;
}

// ── Final Check Email ──
export function buildFinalCheckEmailHtml(month, priorResponse, token) {
  const noUrl = buildResponseUrl(token, 'no');
  const maybeUrl = buildResponseUrl(token, 'maybe');
  const yesUrl = buildResponseUrl(token, 'yes');

  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:${BRAND.lightGray};margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.1);">
    <div style="background:${BRAND.purple};padding:25px 30px;">
      <h1 style="color:white;margin:0;font-size:20px;">Final Month-End Reconfirmation</h1>
      <p style="color:rgba(255,255,255,.7);margin:5px 0 0;font-size:14px;">${month} — 5 days remaining</p>
    </div>
    <div style="padding:30px;">
      <p style="color:${BRAND.darkGray};font-size:15px;line-height:1.6;">We're 5 days from the end of the month. Please reconfirm (or update) the bank account status before the Huntington Payment is due.</p>
      <div style="background:#f8f9fa;border-radius:6px;padding:14px 18px;margin:20px 0;">
        <p style="margin:0;color:${BRAND.medGray};font-size:14px;"><strong>Your prior response on file:</strong></p>
        <p style="margin:8px 0 0;font-size:15px;">${formatPriorResponse(priorResponse)}</p>
      </div>
      <p style="color:${BRAND.medGray};font-size:14px;">Has anything changed? Please reconfirm — <strong>your response notifies the whole team:</strong></p>
      <div style="text-align:center;margin:30px 0;">
        <a href="${noUrl}" style="display:inline-block;background:${BRAND.green};color:white;padding:14px 22px;text-decoration:none;border-radius:6px;font-size:15px;font-weight:bold;margin:6px;">Still Good — No Pull Needed</a>
        <a href="${maybeUrl}" style="display:inline-block;background:${BRAND.orange};color:white;padding:14px 22px;text-decoration:none;border-radius:6px;font-size:15px;font-weight:bold;margin:6px;">Now Uncertain</a>
        <a href="${yesUrl}" style="display:inline-block;background:${BRAND.red};color:white;padding:14px 22px;text-decoration:none;border-radius:6px;font-size:15px;font-weight:bold;margin:6px;">Yes — Need Pull Now</a>
      </div>
      <p style="color:#aaa;font-size:11px;text-align:center;">Yes and Maybe require a note. No confirmation needed for "Still Good."</p>
    </div>
    ${footer()}
  </div>
</body>
</html>`;
}

function formatPriorResponse(r) {
  if (r === 'YES') return 'Yes — Credit line pull needed';
  if (r === 'MAYBE') return 'Maybe — Possibly needed';
  if (r === 'NO') return 'No — Account in good standing';
  return 'No response received yet';
}

// ── Notification Emails (sent to all recipients after a response) ──
export function buildNotificationSubject(responseType, month, isFinal) {
  const tag = isFinal ? '[FINAL CHECK] ' : '';
  if (responseType === 'YES') return `${tag}Credit Line Pull Needed — ${month}`;
  if (responseType === 'MAYBE') return `${tag}Credit Line Pull — Possibly Needed — ${month}`;
  return `${tag}Bank Account Status Confirmed — ${month}`;
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
      <h1 style="color:white;margin:0;font-size:20px;">Credit Line Pull Required${tag}</h1>
      <p style="color:#fadbd8;margin:5px 0 0;font-size:14px;">${month}</p>
    </div>
    <div style="padding:30px;">
      <p style="color:${BRAND.darkGray};font-size:15px;line-height:1.6;">The office manager has confirmed that a <strong>credit line pull will be needed</strong> for next month's Huntington Payment.</p>
      <div style="background:#fdf2f2;border-left:4px solid ${BRAND.red};padding:15px 20px;margin:20px 0;border-radius:0 6px 6px 0;">
        <strong style="color:${BRAND.red};">Notes:</strong>
        <p style="margin:8px 0 0;color:${BRAND.medGray};">${message || '(no notes)'}</p>
      </div>
      <p style="color:${BRAND.medGray};font-size:14px;">Please coordinate to ensure the credit line pull is made before the payment date.</p>
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
      <h1 style="color:white;margin:0;font-size:20px;">Credit Line Pull — Possibly Needed${tag}</h1>
      <p style="color:#fdebd0;margin:5px 0 0;font-size:14px;">${month}</p>
    </div>
    <div style="padding:30px;">
      <p style="color:${BRAND.darkGray};font-size:15px;line-height:1.6;">The office manager is <strong>uncertain</strong> whether a credit line pull will be needed for next month's Huntington Payment. Please monitor closely.</p>
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
      <h1 style="color:white;margin:0;font-size:20px;">Bank Account Status Confirmed${tag}</h1>
      <p style="color:#d5f5e3;margin:5px 0 0;font-size:14px;">${month}</p>
    </div>
    <div style="padding:30px;">
      <p style="color:${BRAND.darkGray};font-size:15px;line-height:1.6;">The office manager has confirmed the bank account balance is sufficient. <strong>No credit line pull is needed</strong> for next month's Huntington Payment.</p>
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
