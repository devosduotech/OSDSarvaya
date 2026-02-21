
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const logger = require('./logger');

const DB_PATH = path.join(__dirname, 'data', 'campblast.db');

// This function will be called once to open the database connection
const initializeDb = async () => {
    try {
        const db = await open({
            filename: DB_PATH,
            driver: sqlite3.Database
        });

        logger.info('Database connection established.');

        // Use PRAGMA for foreign key support
        await db.exec('PRAGMA foreign_keys = ON;');

        // Define schema and create tables if they don't exist
        await db.exec(`
            CREATE TABLE IF NOT EXISTS contacts (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                phone TEXT NOT NULL UNIQUE,
                email TEXT,
                tags TEXT,
                optedIn INTEGER DEFAULT 1,
                optedInAt TEXT,
                optedOutAt TEXT
            );

            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE,
                password TEXT
            );

            CREATE TABLE IF NOT EXISTS groups (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE
            );

            CREATE TABLE IF NOT EXISTS group_contacts (
                group_id TEXT NOT NULL,
                contact_id TEXT NOT NULL,
                PRIMARY KEY (group_id, contact_id),
                FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
                FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS campaign_templates (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                message TEXT,
                attachment TEXT, -- Stored as JSON string
                createdAt TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS campaign_runs (
                id TEXT PRIMARY KEY,
                campaignTemplateId TEXT NOT NULL,
                targetGroupIds TEXT NOT NULL, -- Stored as JSON string
                status TEXT NOT NULL,
                scheduledAt TEXT,
                createdAt TEXT NOT NULL,
                FOREIGN KEY (campaignTemplateId) REFERENCES campaign_templates(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS reports (
                campaignRunId TEXT PRIMARY KEY,
                totalContacts INTEGER NOT NULL,
                sent INTEGER NOT NULL,
                delivered INTEGER NOT NULL,
                read INTEGER NOT NULL,
                failed INTEGER NOT NULL,
                progress REAL NOT NULL,
                FOREIGN KEY (campaignRunId) REFERENCES campaign_runs(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        `);

        // Initialize default settings if they don't exist
        await db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('messagesPerHour', '65')");

        // Migration: Add scheduledAt column if not exists
        try {
            await db.run("ALTER TABLE campaign_runs ADD COLUMN scheduledAt TEXT");
        } catch (e) {
            // Column already exists, ignore
        }

        // Migration: Add optedIn, optedInAt, optedOutAt to contacts
        try {
            await db.run("ALTER TABLE contacts ADD COLUMN optedIn INTEGER DEFAULT 1");
            await db.run("ALTER TABLE contacts ADD COLUMN optedInAt TEXT");
            await db.run("ALTER TABLE contacts ADD COLUMN optedOutAt TEXT");
        } catch (e) {
            // Columns already exist, ignore
        }

        // Migration: Add retryCount to campaign_runs
        try {
            await db.run("ALTER TABLE campaign_runs ADD COLUMN retryCount INTEGER DEFAULT 0");
        } catch (e) {
            // Column already exists, ignore
        }

        // Migration: Add queuePosition to campaign_runs
        try {
            await db.run("ALTER TABLE campaign_runs ADD COLUMN queuePosition INTEGER");
        } catch (e) {
            // Column already exists, ignore
        }

        // Create activities table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                message TEXT NOT NULL,
                metadata TEXT,
                createdAt TEXT NOT NULL
            );
        `);

        // Migration: Add maxRetries to settings
        await db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('maxRetries', '3')");

        logger.info('Database schema verified and is up-to-date.');

        return db;
    } catch (err) {
        logger.fatal({ err }, 'Failed to initialize database');
        process.exit(1);
    }
};

module.exports = initializeDb();
