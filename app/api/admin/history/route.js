import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { initializeDatabase, getReminders, getEventLog } from '@/lib/db';

export async function GET() {
    if (!(await isAuthenticated())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await initializeDatabase();
    const [reminders, events] = await Promise.all([
        getReminders(50),
        getEventLog(100),
    ]);
    return NextResponse.json({ reminders, events });
}
