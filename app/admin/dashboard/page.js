'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('settings');
    const [config, setConfig] = useState({});
    const [recipients, setRecipients] = useState([]);
    const [history, setHistory] = useState({ reminders: [], events: [] });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [alert, setAlert] = useState(null);
    const [newRecipient, setNewRecipient] = useState({ email: '', name: '', role: 'recipient' });

    const showAlert = useCallback((type, message) => {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 5000);
    }, []);

    const fetchData = useCallback(async () => {
        try {
            const [configRes, recipientsRes, historyRes] = await Promise.all([
                fetch('/api/admin/config'),
                fetch('/api/admin/recipients'),
                fetch('/api/admin/history'),
            ]);

            if (configRes.status === 401) {
                router.push('/admin');
                return;
            }

            setConfig(await configRes.json());
            setRecipients(await recipientsRes.json());
            setHistory(await historyRes.json());
        } catch (err) {
            showAlert('error', 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [router, showAlert]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const saveConfig = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/admin/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });
            if (res.ok) showAlert('success', 'Settings saved');
            else showAlert('error', 'Failed to save settings');
        } catch (err) {
            showAlert('error', 'Connection error');
        } finally {
            setSaving(false);
        }
    };

    const addNewRecipient = async () => {
        if (!newRecipient.email) return showAlert('error', 'Email is required');
        try {
            const res = await fetch('/api/admin/recipients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRecipient),
            });
            if (res.ok) {
                setNewRecipient({ email: '', name: '', role: 'recipient' });
                fetchData();
                showAlert('success', 'Recipient added');
            }
        } catch (err) {
            showAlert('error', 'Failed to add recipient');
        }
    };

    const removeRecipient = async (r) => {
        if (!confirm('Remove this recipient? They will be saved in Previous Contacts.')) return;
        try {
            await fetch('/api/admin/recipients', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...r, active: false }),
            });
            fetchData();
            showAlert('success', 'Recipient removed and saved to Previous Contacts');
        } catch (err) {
            showAlert('error', 'Failed to remove recipient');
        }
    };

    const permanentlyDeleteRecipient = async (id) => {
        if (!confirm('Permanently delete this contact? This cannot be undone.')) return;
        try {
            await fetch('/api/admin/recipients', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            fetchData();
            showAlert('success', 'Contact permanently deleted');
        } catch (err) {
            showAlert('error', 'Failed to delete contact');
        }
    };

    const toggleRecipient = async (r) => {
        try {
            await fetch('/api/admin/recipients', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...r, active: !r.active }),
            });
            fetchData();
        } catch (err) {
            showAlert('error', 'Failed to update recipient');
        }
    };

    const sendReminder = async () => {
        if (!confirm('Send a monthly reminder email now?')) return;
        setSaving(true);
        try {
            // Always save current settings first so the email uses whatever is in the form
            const saveRes = await fetch('/api/admin/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });
            if (!saveRes.ok) {
                showAlert('error', 'Could not save settings before sending. Please try again.');
                setSaving(false);
                return;
            }
            const res = await fetch('/api/admin/trigger', { method: 'POST' });
            const data = await res.json();
            if (res.ok) showAlert('success', data.message);
            else showAlert('error', data.error);
        } catch (err) {
            showAlert('error', 'Failed to trigger reminder');
        } finally {
            setSaving(false);
        }
    };

    const forceDebugEvent = async () => {
        if (!confirm('Run a raw email connection debug test?')) return;
        setSaving(true);
        try {
            const res = await fetch('/api/respond', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: 'test', action: '_debug_email' })
            });
            const data = await res.json();
            console.log(data);
            if (res.ok) showAlert('success', 'Email payload successfully transmitted to Google SMTP! Check console for debug info.');
            else showAlert('error', `Debug failed: ${data.error}`);
        } catch (err) {
            showAlert('error', 'Critical test error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/admin/login', { method: 'DELETE' });
        router.push('/admin');
    };

    if (loading) {
        return (
            <div className="page-center">
                <div className="text-center">
                    <div className="spinner" style={{ borderTopColor: 'var(--brand-yellow)', borderColor: '#ddd' }}></div>
                    <p className="mt-2 text-muted">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div className="inline-flex">
                    <h1>Huntington Payment Tracker</h1>
                    <span className="subtitle">Admin Dashboard</span>
                </div>
                <div className="inline-flex">
                    <button className="btn btn-sm btn-dark" onClick={sendReminder} disabled={saving}
                        style={{ background: 'var(--brand-yellow)', color: 'var(--brand-black)' }}>
                        {saving ? 'Sending...' : 'Send Reminder Now'}
                    </button>
                    <button className="btn btn-sm btn-outline" onClick={forceDebugEvent} disabled={saving}
                        style={{ borderColor: 'var(--brand-orange)', color: 'var(--brand-orange)' }}>
                        Send Test Ping
                    </button>
                    <button className="btn btn-sm btn-outline" onClick={handleLogout}
                        style={{ borderColor: '#555', color: '#999' }}>
                        Logout
                    </button>
                </div>
            </div>

            <div className="dashboard-body">
                {alert && <div className={`alert alert-${alert.type}`}>{alert.message}</div>}

                <div className="tabs">
                    {['settings', 'recipients', 'history'].map(tab => (
                        <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {activeTab === 'settings' && <SettingsTab config={config} setConfig={setConfig} saveConfig={saveConfig} saving={saving} />}
                {activeTab === 'recipients' && <RecipientsTab recipients={recipients} newRecipient={newRecipient} setNewRecipient={setNewRecipient} addNewRecipient={addNewRecipient} removeRecipient={removeRecipient} toggleRecipient={toggleRecipient} permanentlyDeleteRecipient={permanentlyDeleteRecipient} />}
                {activeTab === 'history' && <HistoryTab history={history} />}
            </div>
        </div>
    );
}

function SettingsTab({ config, setConfig, saveConfig, saving }) {
    const update = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));
    const tzLabel = { 'America/New_York': 'ET', 'America/Chicago': 'CT', 'America/Denver': 'MT', 'America/Los_Angeles': 'PT' };
    const hint = <span className="text-muted" style={{ fontWeight: 'normal', fontSize: '12px' }}>(available: {'{name}'} = first name, {'{next_month}'} = upcoming month, {'{month}'} = current month)</span>;

    // ── Compute this month's schedule for the Automations panel ──
    const now = new Date();
    const tz = config.timezone || 'America/New_York';
    const monthName = now.toLocaleString('en-US', { month: 'long', timeZone: tz });
    const year = now.getFullYear();
    const monthIdx = now.getMonth();
    const lastDay = new Date(year, monthIdx + 1, 0).getDate();
    const sendDaysBeforeEnd = parseInt(config.send_day || '15');
    const sendDay = lastDay - sendDaysBeforeEnd;  // actual calendar date
    const followUpAfter = parseInt(config.follow_up_after_days || '3');
    const maxFollowUps = parseInt(config.max_follow_ups || '2');
    const finalBefore = parseInt(config.final_check_days_before || '5');
    const sendHour = parseInt(config.send_hour || '12');
    const isEnabled = config.automation_enabled !== 'false';

    const scheduleItems = [{ label: 'Initial reminder', day: sendDay }];
    for (let i = 1; i <= maxFollowUps; i++) {
        const d = sendDay + followUpAfter * i;
        if (d <= lastDay) scheduleItems.push({ label: `Follow-up #${i} (if no response)`, day: d });
    }
    const finalDay = lastDay - finalBefore;
    if (finalDay > sendDay) scheduleItems.push({ label: 'Final verification', day: finalDay });

    const hourLabel = h => h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`;

    return (
        <>
        <div className="card">
            <div className="card-body">
                <div className="section-title"><span>Email Settings</span></div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="form-group">
                        <label>Sender Name</label>
                        <input value={config.sender_name || ''} onChange={e => update('sender_name', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Send Days Before Month End</label>
                        <input type="number" min="1" max="28" value={config.send_day || '15'} onChange={e => update('send_day', e.target.value)} />
                    </div>
                </div>

                <div className="form-group">
                    <label>Email Subject {hint}</label>
                    <input value={config.email_subject || ''} onChange={e => update('email_subject', e.target.value)} />
                </div>
                <div className="form-group">
                    <label>Email Body {hint}</label>
                    <textarea value={config.email_body || ''} onChange={e => update('email_body', e.target.value)} rows="3" />
                </div>

                <div className="section-title mt-3"><span>Follow-up Settings</span></div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                    <div className="form-group">
                        <label>Follow-up After (days)</label>
                        <input type="number" min="1" max="14" value={config.follow_up_after_days || '3'} onChange={e => update('follow_up_after_days', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Max Follow-ups</label>
                        <input type="number" min="0" max="5" value={config.max_follow_ups || '2'} onChange={e => update('max_follow_ups', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Final Check (days before month end)</label>
                        <input type="number" min="1" max="10" value={config.final_check_days_before || '5'} onChange={e => update('final_check_days_before', e.target.value)} />
                    </div>
                </div>

                <div className="section-title mt-3"><span>Final Verification Email</span></div>
                <div className="form-group">
                    <label>Final Check Subject {hint}</label>
                    <input value={config.final_check_email_subject || ''} onChange={e => update('final_check_email_subject', e.target.value)} placeholder="Final Check - Please Reconfirm Bank Status — {month}" />
                </div>
                <div className="form-group">
                    <label>Final Check Body {hint}</label>
                    <textarea value={config.final_check_email_body || ''} onChange={e => update('final_check_email_body', e.target.value)} rows="3" placeholder="Hi {name}, we are 5 days from the end of the month. Please reconfirm the status for {month}." />
                </div>

                <div className="form-group">
                    <label>Timezone</label>
                    <select value={config.timezone || 'America/New_York'} onChange={e => update('timezone', e.target.value)}>
                        <option value="America/New_York">Eastern (ET)</option>
                        <option value="America/Chicago">Central (CT)</option>
                        <option value="America/Denver">Mountain (MT)</option>
                        <option value="America/Los_Angeles">Pacific (PT)</option>
                    </select>
                </div>

                <button className="btn btn-dark mt-2" onClick={saveConfig} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        </div>

        {/* ── Automations Panel ── */}
        <div className="card" style={{ marginTop: '16px' }}>
            <div className="card-body">
                <div className="section-title"><span>Automations</span></div>
                <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#888' }}>
                    Scheduled automations that run automatically each month. Save settings above to update the schedule preview.
                </p>

                <div style={{ border: '1px solid #e8e8e8', borderRadius: '10px', overflow: 'hidden' }}>
                    {/* Header row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: isEnabled ? '#fffdf0' : '#fafafa', borderBottom: '1px solid #e8e8e8' }}>
                        <div>
                            <div style={{ fontWeight: '600', fontSize: '15px' }}>Huntington Payment Check</div>
                            <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>Monthly bank status reminder</div>
                        </div>
                        {/* Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '13px', color: isEnabled ? '#333' : '#aaa', fontWeight: '500' }}>
                                {isEnabled ? 'On' : 'Off'}
                            </span>
                            <div
                                onClick={() => update('automation_enabled', isEnabled ? 'false' : 'true')}
                                style={{ width: '46px', height: '26px', borderRadius: '13px', cursor: 'pointer', background: isEnabled ? 'var(--brand-yellow, #FFD100)' : '#ccc', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
                            >
                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: isEnabled ? '23px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
                            </div>
                        </div>
                    </div>

                    {isEnabled && (
                        <div style={{ padding: '16px 20px' }}>
                            {/* Send time */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                <span style={{ fontSize: '13px', color: '#555', whiteSpace: 'nowrap' }}>Send time:</span>
                                <select
                                    value={config.send_hour || '12'}
                                    onChange={e => update('send_hour', e.target.value)}
                                    style={{ fontSize: '13px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                >
                                    {[6,7,8,9,10,11,12,13,14,15,16,17,18].map(h => (
                                        <option key={h} value={String(h)}>
                                            {hourLabel(h)} {tzLabel[tz] || 'ET'}
                                        </option>
                                    ))}
                                </select>
                                <span style={{ fontSize: '12px', color: '#aaa' }}>Sends {sendDaysBeforeEnd} days before month end (the {sendDay}{sendDay === 1 ? 'st' : sendDay === 2 ? 'nd' : sendDay === 3 ? 'rd' : 'th'} this month)</span>
                            </div>

                            {/* This month's schedule */}
                            <div style={{ background: '#f7f7f7', borderRadius: '8px', padding: '14px 16px' }}>
                                <div style={{ fontSize: '11px', fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>
                                    {monthName} Schedule
                                </div>
                                {scheduleItems.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '5px 0', fontSize: '13px', borderBottom: i < scheduleItems.length - 1 ? '1px solid #ececec' : 'none' }}>
                                        <span style={{ background: 'var(--brand-yellow, #FFD100)', color: '#111', borderRadius: '5px', padding: '3px 10px', fontWeight: '700', fontSize: '12px', minWidth: '62px', textAlign: 'center', flexShrink: 0 }}>
                                            {monthName.slice(0, 3)} {item.day}
                                        </span>
                                        <span style={{ color: '#444' }}>{item.label}</span>
                                        <span style={{ color: '#bbb', fontSize: '12px', marginLeft: 'auto' }}>{hourLabel(sendHour)} {tzLabel[tz] || 'ET'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        </>
    );
}

function RecipientsTab({ recipients, newRecipient, setNewRecipient, addNewRecipient, removeRecipient, toggleRecipient, permanentlyDeleteRecipient }) {
    const roleLabels = { office_manager: 'Office Manager', payer: 'Payer', recipient: 'Recipient' };
    const active = recipients.filter(r => r.active);
    const previous = recipients.filter(r => !r.active);

    return (
        <>
            <div className="card mb-2">
                <div className="card-body">
                    <div className="section-title"><span>Add Recipient</span></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '12px', alignItems: 'end' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Email <span className="required-star">*</span></label>
                            <input value={newRecipient.email} onChange={e => setNewRecipient(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Name</label>
                            <input value={newRecipient.name} onChange={e => setNewRecipient(p => ({ ...p, name: e.target.value }))} placeholder="John Doe" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Role</label>
                            <select value={newRecipient.role} onChange={e => setNewRecipient(p => ({ ...p, role: e.target.value }))}>
                                <option value="recipient">Recipient</option>
                                <option value="office_manager">Office Manager</option>
                                <option value="payer">Payer</option>
                            </select>
                        </div>
                        <button className="btn btn-dark btn-sm" onClick={addNewRecipient} style={{ marginBottom: '0', height: '38px' }}>Add</button>
                    </div>
                </div>
            </div>

            <div className="card mb-2">
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {active.length === 0 && (
                                <tr><td colSpan="4" className="text-center text-muted" style={{ padding: '30px' }}>No active recipients</td></tr>
                            )}
                            {active.map(r => (
                                <tr key={r.id}>
                                    <td>{r.name || '—'}</td>
                                    <td>{r.email}</td>
                                    <td><span className={`badge ${r.role === 'office_manager' ? 'badge-orange' : r.role === 'payer' ? 'badge-red' : 'badge-gray'}`}>{roleLabels[r.role] || r.role}</span></td>
                                    <td>
                                        <button className="btn btn-sm btn-outline" onClick={() => removeRecipient(r)} style={{ borderColor: 'var(--brand-red)', color: 'var(--brand-red)' }}>Remove</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {previous.length > 0 && (
                <div className="card">
                    <div className="card-body">
                        <div className="section-title" style={{ marginBottom: 12 }}>
                            <span>Previous Contacts</span>
                            <span style={{ fontSize: 12, color: '#aaa', fontWeight: 400, marginLeft: 8 }}>Click Re-add to restore, or fill form above</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {previous.map(r => (
                                <div key={r.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    background: '#f8f8f8', border: '1px solid #e8e8e8',
                                    borderRadius: 8, padding: '8px 14px', fontSize: 13,
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#333' }}>{r.name || r.email}</div>
                                        {r.name && <div style={{ color: '#999', fontSize: 12 }}>{r.email}</div>}
                                        <div style={{ marginTop: 2 }}>
                                            <span className={`badge ${r.role === 'office_manager' ? 'badge-orange' : r.role === 'payer' ? 'badge-red' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                                                {roleLabels[r.role] || r.role}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 8 }}>
                                        <button
                                            className="btn btn-sm btn-dark"
                                            onClick={() => toggleRecipient(r)}
                                            style={{ background: 'var(--brand-yellow)', color: 'var(--brand-black)', fontSize: 12, padding: '4px 12px' }}
                                        >
                                            Re-add
                                        </button>
                                        <button
                                            onClick={() => permanentlyDeleteRecipient(r.id)}
                                            style={{ background: 'transparent', border: 'none', color: '#ccc', fontSize: 11, cursor: 'pointer', padding: '2px 0' }}
                                        >
                                            Delete forever
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function HistoryTab({ history }) {
    const { reminders, events } = history;
    const responseBadge = (r) => {
        if (!r) return <span className="badge badge-gray">Pending</span>;
        if (r === 'YES') return <span className="badge badge-red">Yes — Pull Needed</span>;
        if (r === 'MAYBE') return <span className="badge badge-orange">Maybe</span>;
        return <span className="badge badge-green">No — Good</span>;
    };

    return (
        <>
            <div className="card mb-2">
                <div className="card-body">
                    <div className="section-title"><span>Reminder History</span></div>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Month</th>
                                    <th>Status</th>
                                    <th>Response</th>
                                    <th>Notes</th>
                                    <th>Sent</th>
                                    <th>Responded</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reminders.length === 0 && (
                                    <tr><td colSpan="6" className="text-center text-muted" style={{ padding: '30px' }}>No reminders sent yet</td></tr>
                                )}
                                {reminders.map(r => (
                                    <tr key={r.id}>
                                        <td><strong>{r.month}</strong>{r.is_final && <span className="badge badge-orange ml-1" style={{ marginLeft: '8px' }}>Final</span>}</td>
                                        <td><span className={`badge ${r.status === 'responded' ? 'badge-green' : 'badge-gray'}`}>{r.status}</span></td>
                                        <td>{responseBadge(r.response)}</td>
                                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.message || '—'}</td>
                                        <td className="text-muted">{r.sent_at ? new Date(r.sent_at).toLocaleDateString() : '—'}</td>
                                        <td className="text-muted">{r.responded_at ? new Date(r.responded_at).toLocaleDateString() : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-body">
                    <div className="section-title"><span>Event Log</span></div>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Month</th>
                                    <th>Event</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.length === 0 && (
                                    <tr><td colSpan="4" className="text-center text-muted" style={{ padding: '30px' }}>No events yet</td></tr>
                                )}
                                {events.map(e => (
                                    <tr key={e.id}>
                                        <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>{new Date(e.created_at).toLocaleString()}</td>
                                        <td>{e.month || '—'}</td>
                                        <td><code style={{ fontSize: '12px', background: '#f0f0f0', padding: '2px 6px', borderRadius: '3px' }}>{e.event_type}</code></td>
                                        <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.details || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
