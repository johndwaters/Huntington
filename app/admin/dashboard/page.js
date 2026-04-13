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

    const removeRecipient = async (id) => {
        if (!confirm('Remove this recipient?')) return;
        try {
            await fetch('/api/admin/recipients', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            fetchData();
            showAlert('success', 'Recipient removed');
        } catch (err) {
            showAlert('error', 'Failed to remove recipient');
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
                {activeTab === 'recipients' && <RecipientsTab recipients={recipients} newRecipient={newRecipient} setNewRecipient={setNewRecipient} addNewRecipient={addNewRecipient} removeRecipient={removeRecipient} toggleRecipient={toggleRecipient} />}
                {activeTab === 'history' && <HistoryTab history={history} />}
            </div>
        </div>
    );
}

function SettingsTab({ config, setConfig, saveConfig, saving }) {
    const update = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));

    return (
        <div className="card">
            <div className="card-body">
                <div className="section-title">
                    <span>Email Settings</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="form-group">
                        <label>Sender Name</label>
                        <input value={config.sender_name || ''} onChange={e => update('sender_name', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Send Day of Month (1–28)</label>
                        <input type="number" min="1" max="28" value={config.send_day || '15'} onChange={e => update('send_day', e.target.value)} />
                    </div>
                </div>

                <div className="form-group">
                    <label>Email Subject <span className="text-muted">({'{month}'} = auto-filled)</span></label>
                    <input value={config.email_subject || ''} onChange={e => update('email_subject', e.target.value)} />
                </div>

                <div className="form-group">
                    <label>Email Body</label>
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
    );
}

function RecipientsTab({ recipients, newRecipient, setNewRecipient, addNewRecipient, removeRecipient, toggleRecipient }) {
    const roleLabels = { office_manager: 'Office Manager', payer: 'Payer', recipient: 'Recipient' };

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

            <div className="card">
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recipients.length === 0 && (
                                <tr><td colSpan="5" className="text-center text-muted" style={{ padding: '30px' }}>No recipients added yet</td></tr>
                            )}
                            {recipients.map(r => (
                                <tr key={r.id} style={{ opacity: r.active ? 1 : 0.5 }}>
                                    <td>{r.name || '—'}</td>
                                    <td>{r.email}</td>
                                    <td><span className={`badge ${r.role === 'office_manager' ? 'badge-orange' : r.role === 'payer' ? 'badge-red' : 'badge-gray'}`}>{roleLabels[r.role] || r.role}</span></td>
                                    <td><span className={`badge ${r.active ? 'badge-green' : 'badge-gray'}`}>{r.active ? 'Active' : 'Inactive'}</span></td>
                                    <td>
                                        <div className="inline-flex">
                                            <button className="btn btn-sm btn-outline" onClick={() => toggleRecipient(r)}>{r.active ? 'Disable' : 'Enable'}</button>
                                            <button className="btn btn-sm btn-outline" onClick={() => removeRecipient(r.id)} style={{ borderColor: 'var(--brand-red)', color: 'var(--brand-red)' }}>Remove</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
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
