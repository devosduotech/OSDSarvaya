const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

function getDataPath() {
    if (process.env.OSDSARVAYA_DATA) {
        return process.env.OSDSARVAYA_DATA;
    }
    if (process.platform === 'win32' && process.env.APPDATA) {
        return path.join(process.env.APPDATA, 'OSDSarvaya', 'data');
    }
    return path.join(__dirname, 'data');
}

const DB_PATH = path.join(getDataPath(), 'osdsarvaya.db');

let db = null;
let SQL = null;

function saveDatabase() {
    if (db) {
        try {
            const data = db.export();
            const buffer = Buffer.from(data);
            const dir = path.dirname(DB_PATH);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(DB_PATH, buffer);
        } catch (e) {
            logger.error({ e }, 'Failed to save database');
        }
    }
}

const dbWrapper = {
    all: (sql, params = []) => {
        try {
            const stmt = db.prepare(sql);
            if (params.length > 0) stmt.bind(params);
            const results = [];
            while (stmt.step()) {
                results.push(stmt.getAsObject());
            }
            stmt.free();
            return results;
        } catch (e) {
            logger.error({ e, sql }, 'DB all error');
            return [];
        }
    },
    get: (sql, params = []) => {
        try {
            const stmt = db.prepare(sql);
            if (params.length > 0) stmt.bind(params);
            let result = null;
            if (stmt.step()) {
                result = stmt.getAsObject();
            }
            stmt.free();
            return result;
        } catch (e) {
            logger.error({ e, sql }, 'DB get error');
            return null;
        }
    },
    run: (sql, params = []) => {
        try {
            db.run(sql, params);
            saveDatabase();
            return { changes: db.getRowsModified() };
        } catch (e) {
            logger.error({ e, sql, params }, 'DB run error');
            throw e;
        }
    },
    exec: (sql) => {
        try {
            db.exec(sql);
            saveDatabase();
        } catch (e) {
            logger.error({ e, sql }, 'DB exec error');
            throw e;
        }
    }
};

const initializeDb = async () => {
    try {
        SQL = await initSqlJs();
        
        if (fs.existsSync(DB_PATH)) {
            const fileBuffer = fs.readFileSync(DB_PATH);
            db = new SQL.Database(fileBuffer);
            logger.info('Database loaded from file.');
        } else {
            db = new SQL.Database();
            logger.info('New database created.');
        }

        db.run('PRAGMA foreign_keys = ON;');

        db.run(`
            CREATE TABLE IF NOT EXISTS contacts (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                phone TEXT NOT NULL UNIQUE,
                email TEXT,
                tags TEXT,
                optedIn INTEGER DEFAULT 1,
                optedInAt TEXT,
                optedOutAt TEXT
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE,
                password TEXT
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS groups (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS group_contacts (
                group_id TEXT NOT NULL,
                contact_id TEXT NOT NULL,
                PRIMARY KEY (group_id, contact_id),
                FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
                FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS campaign_templates (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                message TEXT,
                attachment TEXT,
                createdAt TEXT NOT NULL
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS campaign_runs (
                id TEXT PRIMARY KEY,
                campaignTemplateId TEXT NOT NULL,
                targetGroupIds TEXT NOT NULL,
                status TEXT NOT NULL,
                scheduledAt TEXT,
                createdAt TEXT NOT NULL,
                retryCount INTEGER DEFAULT 0,
                queuePosition INTEGER,
                FOREIGN KEY (campaignTemplateId) REFERENCES campaign_templates(id) ON DELETE CASCADE
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS reports (
                campaignRunId TEXT PRIMARY KEY,
                totalContacts INTEGER NOT NULL,
                sent INTEGER NOT NULL,
                delivered INTEGER NOT NULL,
                read INTEGER NOT NULL,
                failed INTEGER NOT NULL,
                progress REAL NOT NULL,
                FOREIGN KEY (campaignRunId) REFERENCES campaign_runs(id) ON DELETE CASCADE
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                message TEXT NOT NULL,
                metadata TEXT,
                createdAt TEXT NOT NULL
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS licenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                license_key TEXT UNIQUE NOT NULL,
                customer_email TEXT,
                customer_name TEXT,
                purchase_date TEXT,
                activated INTEGER DEFAULT 0,
                machine_id TEXT,
                activation_date TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        `);

        // Admin user table for first-time setup
        db.run(`
            CREATE TABLE IF NOT EXISTS admin_user (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                jwt_secret TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        `);

        // App settings table for JWT secret storage
        db.run(`
            CREATE TABLE IF NOT EXISTS app_config (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        `);

        db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('messagesPerHour', '65')");
        db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('maxRetries', '3')");

        saveDatabase();
        logger.info('Database schema verified and is up-to-date.');

        setInterval(saveDatabase, 30000);

        return dbWrapper;
    } catch (err) {
        logger.fatal({ err }, 'Failed to initialize database');
        process.exit(1);
    }
};

// Admin user helper functions
const adminDbWrapper = {
    checkExists: ()Admin => {
        const result = dbWrapper.get("SELECT COUNT(*) as count FROM admin_user");
        return result && result.count > 0;
    },

    createAdmin: (username, hashedPassword) => {
        const jwtSecret = require('crypto').randomBytes(64).toString('hex');
        dbWrapper.run(
            "INSERT INTO admin_user (username, password, jwt_secret) VALUES (?, ?, ?)",
            [username, hashedPassword, jwtSecret]
        );
        dbWrapper.run(
            "INSERT OR REPLACE INTO app_config (key, value) VALUES ('jwt_secret', ?)",
            [jwtSecret]
        );
        return jwtSecret;
    },

    verifyAdmin: (username, password) => {
        const admin = dbWrapper.get("SELECT * FROM admin_user WHERE username = ?", [username]);
        if (!admin) return null;
        
        const bcrypt = require('bcrypt');
        const valid = bcrypt.compareSync(password, admin.password);
        if (!valid) return null;
        
        return admin;
    },

    getJwtSecret: () => {
        const config = dbWrapper.get("SELECT value FROM app_config WHERE key = 'jwt_secret'");
        return config ? config.value : null;
    },

    setJwtSecret: (secret) => {
        dbWrapper.run("INSERT OR REPLACE INTO app_config (key, value) VALUES ('jwt_secret', ?)", [secret]);
    }
};

module.exports = initializeDb();
module.exports.adminDb = adminDbWrapper;
