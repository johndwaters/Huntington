import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { initializeDatabase, getAllRecipients, addRecipient, updateRecipient, deleteRecipient } from '@/lib/db';

export async function GET() {
    if (!(await isAuthenticated())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await initializeDatabase();
    const recipients = await getAllRecipients();
    return NextResponse.json(recipients);
}

export async function POST(request) {
    if (!(await isAuthenticated())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        await initializeDatabase();
        const { email, name, role } = await request.json();
        if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        const recipient = await addRecipient(email, name || '', role || 'recipient');
        return NextResponse.json(recipient);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    if (!(await isAuthenticated())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        await initializeDatabase();
        const { id, email, name, role, active } = await request.json();
        await updateRecipient(id, email, name, role, active);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    if (!(await isAuthenticated())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        await initializeDatabase();
        const { id } = await request.json();
        await deleteRecipient(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
