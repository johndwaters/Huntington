import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { initializeDatabase, getConfig, updateConfigBatch } from '@/lib/db';

export async function GET() {
    if (!(await isAuthenticated())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await initializeDatabase();
    const config = await getConfig();
    return NextResponse.json(config);
}

export async function PUT(request) {
    if (!(await isAuthenticated())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        await initializeDatabase();
        const updates = await request.json();
        await updateConfigBatch(updates);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
