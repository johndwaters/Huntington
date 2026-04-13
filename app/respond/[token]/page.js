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
        if (action === 'no') {
            submitResponse(action, '');
        } else {
            setStage('notes');
        }
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

    const handleSubmitNotes = () => {
        if (!message.trim()) {
            setErrorMsg('A note is required before submitting.');
            return;
        }
        setErrorMsg('');
        submitResponse(selectedAction, message.trim());
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
        const labels = { YES: 'Credit line pull needed', MAYBE: 'Possibly needed', NO: 'No action needed' };
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
            YES: { color: 'var(--brand-red)', bg: '#fdf2f2', label: 'Credit Line Pull Needed', msg: 'Your response has been recorded and the whole team has been notified that a credit line pull is needed.' },
            MAYBE: { color: 'var(--brand-orange)', bg: '#fef9e7', label: 'Possibly Needed', msg: 'Your response has been recorded and the whole team has been notified that a credit line pull may be needed.' },
            NO: { color: 'var(--brand-green)', bg: '#eafaf1', label: 'No Pull Needed', msg: 'Your response has been recorded and the whole team has been notified that no credit line pull is needed.' },
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
                        <h2>Monthly Bank Account Status Check</h2>
                        <p>Please select the current status</p>
                    </div>
                    <div className="card-body">
                        <p style={{ fontSize: 15, color: 'var(--brand-med-gray)', lineHeight: 1.6, marginBottom: 24 }}>
                            Your response will be shared with the entire team.
                        </p>
                        <div className="response-buttons">
                            <button className="response-btn" style={{ background: 'var(--brand-green)' }} onClick={() => handleActionSelect('no')}>
                                No — We're Good
                            </button>
                            <button className="response-btn" style={{ background: 'var(--brand-orange)' }} onClick={() => handleActionSelect('maybe')}>
                                Maybe — Not Sure Yet
                            </button>
                            <button className="response-btn" style={{ background: 'var(--brand-red)' }} onClick={() => handleActionSelect('yes')}>
                                Yes — Need Credit Line Pull
                            </button>
                        </div>
                        <p className="text-center text-muted">Yes and Maybe will ask for a required note.</p>
                    </div>
                    <div className="card-footer"><p>ONE HOUR HEATING & AIR</p></div>
                </div>
            </div>
        );
    }

    // stage === 'notes'
    const isMaybe = selectedAction === 'maybe';
    const headerColor = isMaybe ? 'var(--brand-orange)' : 'var(--brand-red)';
    const title = isMaybe ? 'Uncertain — May Need Pull' : 'Credit Line Pull Needed';
    const placeholder = isMaybe
        ? "e.g. Balance is borderline — we'll know more by the 25th."
        : "e.g. Amount needed: $5,000. Balance won't cover the $7,000 payment.";

    return (
        <div className="page-center">
            <div className="card response-card">
                <div className="card-header" style={{ background: headerColor }}>
                    <h2>{title}</h2>
                    <p>Please provide a note for the team</p>
                </div>
                <div className="card-body">
                    {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
                    <p style={{ fontSize: 15, color: '#444', lineHeight: 1.6, marginBottom: 20 }}>
                        Please provide a note for the team before confirming. <strong>This is required.</strong>
                    </p>
                    <div className="form-group">
                        <label>Notes for the team <span className="required-star">*</span></label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={placeholder}
                            rows="4"
                            autoFocus
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button className="btn btn-outline" onClick={() => { setSelectedAction(null); setStage('choose'); setErrorMsg(''); }}>
                            Back
                        </button>
                        <button className="btn btn-block" style={{ background: headerColor, flex: 1 }} onClick={handleSubmitNotes}>
                            Confirm & Notify Team
                        </button>
                    </div>
                </div>
                <div className="card-footer"><p>ONE HOUR HEATING & AIR</p></div>
            </div>
        </div>
    );
}
