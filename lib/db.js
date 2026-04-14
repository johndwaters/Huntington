import postgres from 'postgres';

let sql;

function getDb() {
  if (!sql) {
    let connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;

    if (!connectionString) {
      // Auto-discover any Supabase/Postgres connection string
      for (const [key, value] of Object.entries(process.env)) {
        if (typeof value === 'string' && (value.startsWith('postgres://') || value.startsWith('postgresql://'))) {
          connectionString = value;
          break;
        }
      }
    }

    if (!connectionString) {
      throw new Error('DATABASE_URL or POSTGRES_URL is not set');
    }
    sql = postgres(connectionString, { ssl: 'require' });
  }
  return sql;
}

// ── Schema Setup ──
export async function initializeDatabase() {
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS recipients (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'recipient',
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS reminders (
      id SERIAL PRIMARY KEY,
      month TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      response TEXT,
      message TEXT,
      sent_at TIMESTAMP DEFAULT NOW(),
      responded_at TIMESTAMP,
      follow_up_count INT NOT NULL DEFAULT 0,
      final_check_sent BOOLEAN NOT NULL DEFAULT false,
      is_final BOOLEAN NOT NULL DEFAULT false
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS event_log (
      id SERIAL PRIMARY KEY,
      reminder_id INT REFERENCES reminders(id),
      event_type TEXT NOT NULL,
      details TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Seed default config if empty
  const existing = await sql`SELECT COUNT(*) as count FROM config`;
  if (parseInt(existing[0].count) === 0) {
    const defaults = {
      send_day: '15',
      send_hour: '12',
      sender_name: 'One Hour Heating & Air',
      email_subject: 'Monthly Bank Status Check - {month}',
      email_body: 'Hi {name}, please review our current bank account balance and indicate whether we will need to make a pull on the line of credit for {next_month}\'s Huntington Payment.',
      follow_up_after_days: '3',
      max_follow_ups: '2',
      final_check_days_before: '5',
      final_check_email_subject: 'Final Check - Please Reconfirm Bank Status — {month}',
      final_check_email_body: 'Hi {name}, we are 5 days from the end of the month. Please reconfirm whether we will need to make a pull on the line of credit for {month}\'s Huntington Payment.',
      automation_enabled: 'true',
      timezone: 'America/New_York',
    };
    for (const [key, value] of Object.entries(defaults)) {
      await sql`INSERT INTO config (key, value) VALUES (${key}, ${value}) ON CONFLICT (key) DO NOTHING`;
    }
  }

  return true;
}

// ── Config ──
export async function getConfig() {
  const sql = getDb();
  const rows = await sql`SELECT key, value FROM config`;
  const config = {};
  for (const row of rows) {
    config[row.key] = row.value;
  }
  return config;
}

export async function updateConfig(key, value) {
  const sql = getDb();
  await sql`
    INSERT INTO config (key, value) VALUES (${key}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = ${value}
  `;
}

export async function updateConfigBatch(updates) {
  const sql = getDb();
  for (const [key, value] of Object.entries(updates)) {
    await sql`
      INSERT INTO config (key, value) VALUES (${key}, ${value})
      ON CONFLICT (key) DO UPDATE SET value = ${value}
    `;
  }
}

// ── Recipients ──
export async function getRecipients() {
  const sql = getDb();
  return await sql`SELECT * FROM recipients WHERE active = true ORDER BY role, name`;
}

export async function getAllRecipients() {
  const sql = getDb();
  return await sql`SELECT * FROM recipients ORDER BY active DESC, role, name`;
}

export async function addRecipient(email, name, role) {
  const sql = getDb();
  const result = await sql`
    INSERT INTO recipients (email, name, role) VALUES (${email}, ${name}, ${role})
    RETURNING *
  `;
  return result[0];
}

export async function updateRecipient(id, email, name, role, active) {
  const sql = getDb();
  await sql`
    UPDATE recipients SET email = ${email}, name = ${name}, role = ${role}, active = ${active}
    WHERE id = ${id}
  `;
}

export async function deleteRecipient(id) {
  const sql = getDb();
  await sql`DELETE FROM recipients WHERE id = ${id}`;
}

// ── Reminders ──
export async function createReminder(month, token) {
  const sql = getDb();
  const result = await sql`
    INSERT INTO reminders (month, token) VALUES (${month}, ${token})
    RETURNING *
  `;
  return result[0];
}

export async function getReminderByToken(token) {
  const sql = getDb();
  const result = await sql`SELECT * FROM reminders WHERE token = ${token}`;
  return result[0] || null;
}

export async function getCurrentReminder() {
  const sql = getDb();
  const result = await sql`
    SELECT * FROM reminders ORDER BY sent_at DESC LIMIT 1
  `;
  return result[0] || null;
}

export async function getActiveReminder(month) {
  const sql = getDb();
  const result = await sql`
    SELECT * FROM reminders WHERE month = ${month} AND is_final = false
    ORDER BY sent_at DESC LIMIT 1
  `;
  return result[0] || null;
}

export async function recordResponse(token, response, message) {
  const sql = getDb();
  await sql`
    UPDATE reminders
    SET status = 'responded', response = ${response}, message = ${message}, responded_at = NOW()
    WHERE token = ${token}
  `;
}

export async function incrementFollowUp(id) {
  const sql = getDb();
  await sql`
    UPDATE reminders SET follow_up_count = follow_up_count + 1 WHERE id = ${id}
  `;
}

export async function markFinalCheckSent(id) {
  const sql = getDb();
  await sql`UPDATE reminders SET final_check_sent = true WHERE id = ${id}`;
}

export async function createFinalReminder(month, token, originalId) {
  const sql = getDb();
  // Mark original as having final check sent
  await sql`UPDATE reminders SET final_check_sent = true WHERE id = ${originalId}`;
  const result = await sql`
    INSERT INTO reminders (month, token, is_final) VALUES (${month}, ${token}, true)
    RETURNING *
  `;
  return result[0];
}

// ── Event Log ──
export async function logEvent(reminderId, eventType, details) {
  const sql = getDb();
  await sql`
    INSERT INTO event_log (reminder_id, event_type, details)
    VALUES (${reminderId}, ${eventType}, ${details})
  `;
}

export async function getEventLog(limit = 50) {
  const sql = getDb();
  return await sql`
    SELECT el.*, r.month, r.response
    FROM event_log el
    LEFT JOIN reminders r ON el.reminder_id = r.id
    ORDER BY el.created_at DESC
    LIMIT ${limit}
  `;
}

export async function getReminders(limit = 20) {
  const sql = getDb();
  return await sql`
    SELECT * FROM reminders ORDER BY sent_at DESC LIMIT ${limit}
  `;
}
