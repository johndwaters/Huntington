import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
    initializeDatabase, getConfig, getRecipients, getActiveReminder,
    getCurrentReminder, createReminder, createFinalReminder,
    incrementFollowUp, logEvent
} from '@/lib/db';
import {
    sendEmail, buildReminderEmailHtml, buildFinalCheckEmailHtml,
    buildFinalCheckNotificationHtml, buildNotificationSubject
} from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await initializeDatabase();
        const config = await getConfig();

        // Respect the automation on/off toggle
        if (config.automation_enabled === 'false') {
            return NextResponse.json({ success: true, results: [], skipped: 'automation disabled' });
        }

        const now = new Date();
        const tz = config.timezone || 'America/New_York';
        const results = [];

        // Get current month string and time components in configured timezone
        const month = now.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: tz });
        const dayOfMonth = parseInt(now.toLocaleString('en-US', { day: 'numeric', timeZone: tz }));
        const hourOfDay = parseInt(now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: tz }));
        const configuredHour = parseInt(config.send_hour || '12');

        // Only act during the configured send hour
        if (hourOfDay !== configuredHour) {
            return NextResponse.json({ success: true, results: [], skipped: `not send hour (now=${hourOfDay}, configured=${configuredHour})` });
        }

        const sendDay = parseInt(config.send_day || '15');
        const followUpAfterDays = parseInt(config.follow_up_after_days || '3');
        const maxFollowUps = parseInt(config.max_follow_ups || '2');
        const finalCheckDaysBefore = parseInt(config.final_check_days_before || '5');

        // Calculate last day of month
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysLeft = lastDay - dayOfMonth;

        // 1. Check if we need to send monthly reminder
        if (dayOfMonth === sendDay) {
            const existing = await getActiveReminder(month);
            if (!existing) {
                results.push(await sendMonthlyReminder(config, month));
            } else {
                results.push({ action: 'monthly_reminder', status: 'skipped', reason: 'already sent' });
            }
        }

        // 2. Check follow-ups
        const currentReminder = await getActiveReminder(month);
        if (currentReminder && currentReminder.status === 'pending') {
            const sentAt = new Date(currentReminder.sent_at);
            const daysSince = Math.floor((now - sentAt) / 86400000);
            const followUpCount = currentReminder.follow_up_count || 0;

            if (followUpCount < maxFollowUps && daysSince >= followUpAfterDays * (followUpCount + 1)) {
                results.push(await sendFollowUp(config, currentReminder, followUpCount + 1));
            }
        }

        // 3. Check final confirmation
        if (daysLeft === finalCheckDaysBefore) {
            const reminder = await getActiveReminder(month);
            if (reminder && !reminder.final_check_sent) {
                results.push(await sendFinalCheck(config, reminder, month));
            }
        }

        return NextResponse.json({ success: true, results, timestamp: now.toISOString() });
    } catch (error) {
        console.error('Cron error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function sendMonthlyReminder(config, month) {
    const token = uuidv4();
    const reminder = await createReminder(month, token);

    const recipients = await getRecipients();
    const officeManager = recipients.find(r => r.role === 'office_manager');

    if (!officeManager) {
        await logEvent(reminder.id, 'ERROR', 'No office manager configured');
        return { action: 'monthly_reminder', status: 'error', reason: 'no office manager' };
    }

    // Compute next month name for template variables
    const tz = config.timezone || 'America/New_York';
    const nowDate = new Date();
    const nextMonthDate = new Date(nowDate);
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const nextMonth = nextMonthDate.toLocaleString('en-US', { month: 'long', timeZone: tz });

    // Resolve recipient first name
    const recipientFirstName = officeManager.name
        ? officeManager.name.trim().split(/\s+/)[0]
        : 'Hi';

    // Replace template variables: {name}, {next_month}, {month}
    const rawBody = config.email_body || 'Hi {name}, please review our current bank account balance and indicate whether we will need to make a pull on the line of credit for {next_month}\'s Huntington Payment.';
    const bodyText = rawBody
        .replace(/{name}/g, recipientFirstName)
        .replace(/{next_month}/g, nextMonth)
        .replace(/{month}/g, month);

    const rawSubject = config.email_subject || 'Monthly Bank Status Check - {month}';
    const subject = rawSubject
        .replace(/{name}/g, recipientFirstName)
        .replace(/{next_month}/g, nextMonth)
        .replace(/{month}/g, month);

    const senderName = config.sender_name || 'One Hour Heating & Air';

    const html = buildReminderEmailHtml(bodyText, month, token);

    const ccEmails = recipients.filter(r => r.role !== 'office_manager').map(r => r.email);
    await sendEmail(officeManager.email, subject, html, senderName, ccEmails);
    await logEvent(reminder.id, 'MONTHLY_REMINDER_SENT', `Sent to: ${officeManager.email} and CC'd ${ccEmails.length} others`);

    return { action: 'monthly_reminder', status: 'sent', to: officeManager.email };
}

async function sendFollowUp(config, reminder, followUpNumber) {
    const recipients = await getRecipients();
    const officeManager = recipients.find(r => r.role === 'office_manager');
    if (!officeManager) return { action: 'follow_up', status: 'error', reason: 'no office manager' };

    const senderName = config.sender_name || 'One Hour Heating & Air';
    const firstName = officeManager.name ? officeManager.name.trim().split(/\s+/)[0] : 'Hi';
    const subject = `[Reminder #${followUpNumber}] Bank Status Response Needed — ${reminder.month}`;
    const bodyText = `Hi ${firstName}, this is follow-up #${followUpNumber}. We haven't received a response to the monthly bank account status check for <strong>${reminder.month}</strong>. Please respond at your earliest convenience.`;

    const html = buildReminderEmailHtml(bodyText, reminder.month, reminder.token, followUpNumber);
    const ccEmails = recipients.filter(r => r.role !== 'office_manager').map(r => r.email);

    await sendEmail(officeManager.email, subject, html, senderName, ccEmails);
    await incrementFollowUp(reminder.id);
    await logEvent(reminder.id, `FOLLOWUP_${followUpNumber}_SENT`, `Follow-up #${followUpNumber} sent to ${officeManager.email} and CC'd ${ccEmails.length} others`);

    return { action: 'follow_up', status: 'sent', number: followUpNumber };
}

async function sendFinalCheck(config, originalReminder, month) {
    const token = uuidv4();
    const finalReminder = await createFinalReminder(month, token, originalReminder.id);

    const recipients = await getRecipients();
    const officeManager = recipients.find(r => r.role === 'office_manager');
    if (!officeManager) return { action: 'final_check', status: 'error', reason: 'no office manager' };

    const senderName = config.sender_name || 'One Hour Heating & Air';
    const priorResponse = originalReminder.response || 'NOT_RESPONDED';
    const tz = config.timezone || 'America/New_York';

    // Resolve recipient first name for personalisation
    const firstName = officeManager.name ? officeManager.name.trim().split(/\s+/)[0] : 'Hi';

    // Build customised final check body using template variables
    const rawFinalBody = config.final_check_email_body || null;
    const finalBodyText = rawFinalBody
        ? rawFinalBody.replace(/{name}/g, firstName).replace(/{month}/g, month)
        : null;

    // Build customised final check subject
    const rawFinalSubject = config.final_check_email_subject || `[FINAL CHECK] Please Reconfirm Bank Status — {month}`;
    const finalSubject = rawFinalSubject.replace(/{name}/g, firstName).replace(/{month}/g, month);

    // Send final check to office manager and CC everyone else
    const subject = finalSubject;
    const html = buildFinalCheckEmailHtml(month, priorResponse, token, finalBodyText);
    const ccEmails = recipients.filter(r => r.role !== 'office_manager').map(r => r.email);

    await sendEmail(officeManager.email, subject, html, senderName, ccEmails);

    // Notify all recipients that final check was sent (this could be redundant with CC, but acts as a formal system log)
    const allEmails = recipients.filter(r => r.active).map(r => r.email);
    const notifSubject = `[FINAL CHECK SENT] Awaiting Reconfirmation — ${month}`;
    const notifHtml = buildFinalCheckNotificationHtml(month, priorResponse);

    if (allEmails.length > 0) {
        await sendEmail(allEmails, notifSubject, notifHtml, senderName);
    }

    await logEvent(finalReminder.id, 'FINAL_CHECK_SENT', `Sent to ${officeManager.email}, notified ${allEmails.length} recipients`);

    return { action: 'final_check', status: 'sent' };
}
