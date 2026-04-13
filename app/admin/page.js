'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            if (res.ok) {
                // Initialize database on first login
                await fetch('/api/admin/setup');
                router.push('/admin/dashboard');
            } else {
                setError('Invalid password');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-center">
            <div className="card login-card">
                <div className="card-header dark">
                    <h1>Huntington Payment Tracker</h1>
                    <p>Admin Login</p>
                </div>
                <div className="card-body">
                    {error && <div className="alert alert-error">{error}</div>}
                    <form onSubmit={handleLogin}>
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter admin password"
                                autoFocus
                            />
                        </div>
                        <button type="submit" className="btn btn-dark btn-block" disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                </div>
                <div className="card-footer">
                    <p>ONE HOUR HEATING & AIR</p>
                </div>
            </div>
        </div>
    );
}
