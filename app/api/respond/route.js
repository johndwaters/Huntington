import { NextResponse } from 'next/server';
import {
    initializeDatabase, getReminderByToken, recordResponse,
    getRecipients, getConfig, logEvent
} from '@/lib/db';
import {
    sendEmail, buildNotificationSubject, buildNotificationEmailHtml
} from '@/lib/email';

export async function POST(request) {
    try {
        await initializeDatabase();
        const { token, action, message } = await request.json();

        if (!token || !action) {
            return NextResponse.json({ error: 'Missing token or action' }, { status: 400 });
        }

        const reminder = await getReminderByToken(token);
        if (!reminder) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
        }

        if (reminder.status === 'responded') {
            return NextResponse.json({ error: 'Already responded', response: reminder.response }, { status: 409 });
        }

        // Validate-only request (used by response page to check token)
        if (action === '_validate') {
            return NextResponse.json({ valid: true, month: reminder.month });
        }

        const responseType = action.toUpperCase();
        if (!['YES', 'MAYBE', 'NO'].includes(responseType)) {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        // Record the response
        await recordResponse(token, responseType, message || 'No extra notes provided by user.');

        const config = await getConfig();
        const recipients = await getRecipients();
        const senderName = config.sender_name || 'One Hour Heating & Air';

        // Notify ALL recipients in a single batch email to avoid SMTP timeouts
        const subject = buildNotificationSubject(responseType, reminder.month, reminder.is_final);
        const html = buildNotificationEmailHtml(responseType, reminder.month, message, reminder.is_final);

        const allEmails = recipients.map(r => r.email);

        if (allEmails.length > 0) {
            try {
                await sendEmail(allEmails, subject, html, senderName);
            } catch (e) {
                console.error(`Failed to notify distro list:`, e);
                // We'll throw so the UI shows an error instead of failing silently
                throw new Error('Database updated, but failed to dispatch the email: ' + e.message);
            }
        }

        const label = reminder.is_final ? 'FINAL_CHECK' : 'MONTHLY';
        await logEvent(reminder.id, `${label}_RESPONSE_${responseType}`, message || '(no notes)');
        await logEvent(reminder.id, `${label}_NOTIFICATION_SENT`, `Notified ${recipients.length} recipient(s)`);

        return NextResponse.json({ success: true, response: responseType });
    } catch (error) {
        console.error('Response error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
