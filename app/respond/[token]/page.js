'use client';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

export default function RespondPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const token = params.token;
    const preselectedAction = searchParams.get('action');

    const [stage, setStage] = useState('loading'); // loading, choose, notes, submitting, done, error
    const [selectedAction, setSelectedAction] = useState(null);
    const [message, setMessage] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [result, setResult] = useState(null);
    const [reminderMonth, setReminderMonth] = useState('');

    useEffect(() => {
        // Validate token
        const validate = async () => {
            try {
                const res = await fetch(`/api/respond`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, action: '_validate' }),
                });
                if (res.status === 404) {
                    setStage('error');
                    setErrorMsg('This link has expired or is invalid. Please check your email for the most recent reminder.');
                    return;
                }
                if (res.status === 409) {
                    const data = await res.json();
                    setResult(data.response);
                    setStage('already');
                    return;
                }
                // Token is valid — show action selection or auto-select
                if (preselectedAction && ['yes', 'maybe', 'no'].includes(preselectedAction)) {
                    handleActionSelect(preselectedAction);
                } else {
                    setStage('choose');
                }
            } catch (err) {
                setStage('error');
                setErrorMsg('Unable to connect. Please try again.');
            }
        };
        validate();
    }, [token, preselectedAction]);

    const handleActionSelect = (action) => {
        setSelectedAction(action);
        submitResponse(action, '');
    };

    const submitResponse = async (action, msg) => {
        setStage('submitting');
        try {
            const res = await fetch('/api/respond', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, action, message: msg }),
            });
            const data = await res.json();
            if (res.ok) {
                setResult(data.response);
                setStage('done');
            } else {
                if (res.status === 409) {
                    setResult(data.response);
                    setStage('already');
                } else {
                    setErrorMsg(data.error || 'Something went wrong');
                    setStage('notes'); // go back to notes form
                }
            }
        } catch (err) {
            setErrorMsg('Unable to connect. Please try again.');
            setStage('notes');
        }
    };

    // The notes form submission is intentionally removed since it's now a 1-click system.

    // ── Render stages ──

    if (stage === 'loading' || stage === 'submitting') {
        return (
            <div className="page-center">
                <div className="card response-card">
                    <div className="card-header dark">
                        <h2>Huntington Payment Tracker</h2>
                        <p>{stage === 'loading' ? 'Validating link...' : 'Submitting response...'}</p>
                    </div>
                    <div className="card-body text-center">
                        <div className="spinner" style={{ borderTopColor: 'var(--brand-yellow)', borderColor: '#ddd', width: 36, height: 36, borderWidth: 4 }}></div>
                        <p className="mt-2 text-muted">Please wait...</p>
                    </div>
                    <div className="card-footer"><p>ONE HOUR HEATING & AIR</p></div>
                </div>
            </div>
        );
    }

    if (stage === 'error') {
        return (
            <div className="page-center">
                <div className="card response-card">
                    <div className="card-header" style={{ background: 'var(--brand-red)' }}>
                        <h2>Something Went Wrong</h2>
                    </div>
                    <div className="card-body text-center">
                        <p style={{ fontSize: 15, color: 'var(--brand-med-gray)', lineHeight: 1.6 }}>{errorMsg}</p>
                    </div>
                    <div className="card-footer"><p>ONE HOUR HEATING & AIR</p></div>
                </div>
            </div>
        );
    }

    if (stage === 'already') {
        const labels = { YES: 'Funds are low', MAYBE: 'Uncertain', NO: 'Funds are good' };
        return (
            <div className="page-center">
                <div className="card response-card">
                    <div className="card-header" style={{ background: '#7f8c8d' }}>
                        <h2>Already Responded</h2>
                    </div>
                    <div className="card-body text-center">
                        <p style={{ fontSize: 15, color: 'var(--brand-med-gray)', lineHeight: 1.6 }}>
                            A response has already been recorded: <strong>{labels[result] || 'Unknown'}</strong>.
                        </p>
                        <p className="mt-2 text-muted">If you need to update your answer, look for the final re-check email or contact your administrator.</p>
                    </div>
                    <div className="card-footer"><p>ONE HOUR HEATING & AIR</p></div>
                </div>
            </div>
        );
    }

    if (stage === 'done') {
        const configs = {
            YES: { color: 'var(--brand-red)', bg: '#fdf2f2', label: 'Funds are Low', msg: 'Your response has been recorded and the whole team has been notified that funds are low.' },
            MAYBE: { color: 'var(--brand-orange)', bg: '#fef9e7', label: 'Uncertain', msg: 'Your response has been recorded and the whole team has been notified that the status is uncertain.' },
            NO: { color: 'var(--brand-green)', bg: '#eafaf1', label: 'Funds are Good', msg: 'Your response has been recorded and the whole team has been notified that funds are good.' },
        };
        const c = configs[result] || configs.NO;
        return (
            <div className="page-center">
                <div className="card response-card">
                    <div className="card-header" style={{ background: c.color }}>
                        <h2>Response Recorded</h2>
                    </div>
                    <div className="card-body text-center">
                        <div style={{ display: 'inline-block', background: c.bg, color: c.color, padding: '4px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{c.label}</div>
                        <p style={{ fontSize: 15, color: 'var(--brand-med-gray)', lineHeight: 1.6 }}>{c.msg}</p>
                        <p className="mt-3 text-muted">You may close this window.</p>
                    </div>
                    <div className="card-footer"><p>ONE HOUR HEATING & AIR</p></div>
                </div>
            </div>
        );
    }

    if (stage === 'choose') {
        return (
            <div className="page-center">
                <div className="card response-card">
                    <div className="card-header dark">
                        <h2>Monthly Status Check</h2>
                        <p>Please select the current status</p>
                    </div>
                    <div className="card-body">
                        <p style={{ fontSize: 15, color: 'var(--brand-med-gray)', lineHeight: 1.6, marginBottom: 24 }}>
                            Your response will be shared with the entire team.
                        </p>
                        <div className="response-buttons">
                            <button className="response-btn" style={{ background: 'var(--brand-green)' }} onClick={() => handleActionSelect('no')}>
                                Yes — Funds Good
                            </button>
                            <button className="response-btn" style={{ background: 'var(--brand-orange)' }} onClick={() => handleActionSelect('maybe')}>
                                Maybe
                            </button>
                            <button className="response-btn" style={{ background: 'var(--brand-red)' }} onClick={() => handleActionSelect('yes')}>
                                No — Funds are Low
                            </button>
                        </div>
                        <p className="text-center text-muted">Clicking any button will immediately notify the team.</p>
                    </div>
                    <div className="card-footer"><p>ONE HOUR HEATING & AIR</p></div>
                </div>
            </div>
        );
    }

    // Fallback
    return null;
}
