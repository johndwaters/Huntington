'use client';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

const ACTION_CONFIG = {
    no:    { color: 'var(--brand-green)',  label: 'Yes — Funds Good',    responseKey: 'NO' },
    maybe: { color: 'var(--brand-orange)', label: 'Maybe — Uncertain',   responseKey: 'MAYBE' },
    yes:   { color: 'var(--brand-red)',    label: 'No — Funds are Low',  responseKey: 'YES' },
};

export default function RespondPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const token = params.token;
    const preselectedAction = searchParams.get('action');

    const [stage, setStage] = useState('loading'); // loading, choose, confirm, submitting, done, already, error
    const [selectedAction, setSelectedAction] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [result, setResult] = useState(null);
    const [reminderMonth, setReminderMonth] = useState('');

    useEffect(() => {
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
                const data = await res.json();
                if (data.month) setReminderMonth(data.month);

                // Token is valid — show confirmation screen (never auto-submit)
                if (preselectedAction && ACTION_CONFIG[preselectedAction]) {
                    setSelectedAction(preselectedAction);
                    setStage('confirm');
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
        setStage('confirm');
    };

    const handleConfirm = async () => {
        setStage('submitting');
        try {
            const res = await fetch('/api/respond', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, action: selectedAction, message: '' }),
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
                    setStage('error');
                }
            }
        } catch (err) {
            setErrorMsg('Unable to connect. Please try again.');
            setStage('error');
        }
    };

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

    if (stage === 'confirm') {
        const cfg = ACTION_CONFIG[selectedAction] || ACTION_CONFIG.no;
        return (
            <div className="page-center">
                <div className="card response-card">
                    <div className="card-header" style={{ background: cfg.color }}>
                        <h2>Confirm Your Response</h2>
                        {reminderMonth && <p style={{ color: 'rgba(255,255,255,0.8)', margin: '4px 0 0', fontSize: 14 }}>{reminderMonth}</p>}
                    </div>
                    <div className="card-body text-center">
                        <p style={{ fontSize: 14, color: 'var(--brand-med-gray)', marginBottom: 12 }}>You selected:</p>
                        <div style={{
                            display: 'inline-block',
                            background: cfg.color,
                            color: 'white',
                            padding: '10px 28px',
                            borderRadius: 8,
                            fontSize: 16,
                            fontWeight: 700,
                            marginBottom: 24,
                        }}>
                            {cfg.label}
                        </div>
                        <p style={{ fontSize: 14, color: 'var(--brand-med-gray)', lineHeight: 1.6, marginBottom: 28 }}>
                            Once confirmed, your response will be recorded and the entire team will be notified.
                        </p>
                        <button
                            onClick={handleConfirm}
                            style={{
                                background: cfg.color,
                                color: 'white',
                                border: 'none',
                                borderRadius: 8,
                                padding: '14px 36px',
                                fontSize: 16,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'block',
                                width: '100%',
                                marginBottom: 12,
                            }}
                        >
                            Confirm &amp; Submit
                        </button>
                        <button
                            onClick={() => setStage('choose')}
                            style={{
                                background: 'transparent',
                                color: 'var(--brand-med-gray)',
                                border: '1px solid #ddd',
                                borderRadius: 8,
                                padding: '10px 24px',
                                fontSize: 14,
                                cursor: 'pointer',
                                display: 'block',
                                width: '100%',
                            }}
                        >
                            ← Change my answer
                        </button>
                    </div>
                    <div className="card-footer"><p>ONE HOUR HEATING & AIR</p></div>
                </div>
            </div>
        );
    }

    if (stage === 'done') {
        const configs = {
            YES: { color: 'var(--brand-red)',    bg: '#fdf2f2', label: 'Funds are Low',  msg: 'Your response has been recorded and the whole team has been notified that funds are low.' },
            MAYBE: { color: 'var(--brand-orange)', bg: '#fef9e7', label: 'Uncertain',      msg: 'Your response has been recorded and the whole team has been notified that the status is uncertain.' },
            NO: { color: 'var(--brand-green)',  bg: '#eafaf1', label: 'Funds are Good', msg: 'Your response has been recorded and the whole team has been notified that funds are good.' },
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
                        {reminderMonth && <p style={{ color: 'rgba(255,255,255,0.6)', margin: '4px 0 0', fontSize: 14 }}>{reminderMonth}</p>}
                    </div>
                    <div className="card-body">
                        <p style={{ fontSize: 15, color: 'var(--brand-med-gray)', lineHeight: 1.6, marginBottom: 24 }}>
                            Please select the current status. You will be asked to confirm before your response is sent to the team.
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
                    </div>
                    <div className="card-footer"><p>ONE HOUR HEATING & AIR</p></div>
                </div>
            </div>
        );
    }

    return null;
}
