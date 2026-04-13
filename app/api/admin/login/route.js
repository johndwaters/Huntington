import { NextResponse } from 'next/server';
import { verifyPassword, createSession, clearSession } from '@/lib/auth';

export async function POST(request) {
    try {
        const { password } = await request.json();
        if (await verifyPassword(password)) {
            await createSession();
            return NextResponse.json({ success: true });
        }
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE() {
    await clearSession();
    return NextResponse.json({ success: true });
}
