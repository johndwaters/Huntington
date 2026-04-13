import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { initializeDatabase } from '@/lib/db';

export async function GET() {
    if (!(await isAuthenticated())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        await initializeDatabase();
        return NextResponse.json({ success: true, message: 'Database initialized successfully' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
