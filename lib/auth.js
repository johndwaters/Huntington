import { cookies } from 'next/headers';

const SESSION_COOKIE = 'ht_admin_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function verifyPassword(password) {
    return password === process.env.ADMIN_PASSWORD;
}

export async function createSession() {
    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + SESSION_DURATION);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires,
        path: '/',
    });
    return token;
}

export async function isAuthenticated() {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE);
    return !!session?.value;
}

export async function clearSession() {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
}
