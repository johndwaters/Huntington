import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { isAuthenticated } from '@/lib/auth';
import {
    initializeDatabase, getConfig, getRecipients,
    createReminder, logEvent
} from '@/lib/db';
import { sendEmail, buildReminderEmailHtml } from '@/lib/email';

export async function POST(request) {
    if (!(await isAuthenticated())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await initializeDatabase();
        const config = await getConfig();
        const recipients = await getRecipients();
        const officeManager = recipients.find(r => r.role === 'office_manager');

        if (!officeManager) {
            return NextResponse.json({ error: 'No office manager configured. Add one in Recipients.' }, { status: 400 });
        }

        const now = new Date();
        const tz = config.timezone || 'America/New_York';
        const month = now.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: tz });

        // Compute the upcoming (next) month name for use in email templates
        const nextMonthDate = new Date(now);
        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
        const nextMonth = nextMonthDate.toLocaleString('en-US', { month: 'long', timeZone: tz });

        const token = uuidv4();
        const reminder = await createReminder(month, token);

        // Resolve recipient's first name for personalisation
        const recipientFirstName = officeManager.name
            ? officeManager.name.trim().split(/\s+/)[0]
            : 'Hi';

        // Replace template variables: {name}, {next_month}, {month}
        const rawBody = config.email_body || 'Please review our current bank account balance and indicate whether we will need to make a pull on the line of credit for {next_month}\'s Huntington Payment.';
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

        // CC everyone who isn't the office manager
        const ccEmails = recipients.filter(r => r.role !== 'office_manager').map(r => r.email);

        await sendEmail(officeManager.email, subject, html, senderName, ccEmails);
        await logEvent(reminder.id, 'MANUAL_REMINDER_SENT', `Sent to: ${officeManager.email} and CC'd ${ccEmails.length} others`);

        return NextResponse.json({
            success: true,
            message: `Reminder sent to ${officeManager.email} and CC'd ${ccEmails.length} recipients`,
        });
    } catch (error) {
        console.error('Manual trigger error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
