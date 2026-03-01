
const express = require('express');
const router = express.Router();
const dbPromise = require('../database');
const logger = require('../logger');
const { APP_VERSION } = require('../version');

const API_VERSION = 'v1';

// =====================================================
// VERSION INFO
// =====================================================
router.get('/version', (req, res) => {
    res.json({
        appVersion: APP_VERSION,
        apiVersion: API_VERSION,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

// =====================================================
// PHONE VALIDATION
// =====================================================
function isValidPhone(phone) {
    if (!phone) return false;
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
}

function normalizePhone(phone) {
    return phone.replace(/\D/g, '');
}

// GET ALL DATA
router.get('/data', async (req, res) => {
    try {
        const db = await dbPromise;
        const [contacts, groups, templates, runs, reports, settings, activities] = await Promise.all([
            db.all("SELECT * FROM contacts ORDER BY name"),
            db.all("SELECT g.id, g.name, json_group_array(gc.contact_id) as contactIds FROM groups g LEFT JOIN group_contacts gc ON g.id = gc.group_id GROUP BY g.id ORDER BY g.name"),
            db.all("SELECT * FROM campaign_templates ORDER BY createdAt DESC"),
            db.all("SELECT * FROM campaign_runs ORDER BY createdAt DESC"),
            db.all("SELECT * FROM reports"),
            db.all("SELECT * FROM settings"),
            db.all("SELECT * FROM activities ORDER BY createdAt DESC LIMIT 100")
        ]);
        
        // Post-process groups to handle null contactIds for empty groups
        const processedGroups = groups.map(g => ({...g, contactIds: JSON.parse(g.contactIds || '[]').filter(id => id !== null) }));
        const settingsObj = settings.reduce((acc, { key, value }) => { acc[key] = isNaN(Number(value)) ? value : Number(value); return acc; }, {});

        res.json({ 
            contacts, 
            groups: processedGroups, 
            campaignTemplates: templates.map(t => ({...t, attachment: t.attachment ? JSON.parse(t.attachment) : null})), 
            campaignRuns: runs.map(r => ({...r, targetGroupIds: JSON.parse(r.targetGroupIds)})), 
            reports, 
            settings: settingsObj,
            activities
        });
    } catch (err) {
        logger.error({ err }, "Failed to fetch all data");
        res.status(500).json({ message: "Error fetching data" });
    }
});

// CONTACTS
router.post('/contacts', async (req, res) => {
    const { id, name, phone, email, tags } = req.body;
    
    if (!name || !name.trim()) {
        return res.status(400).json({ message: "Name is required" });
    }
    
    if (!isValidPhone(phone)) {
        return res.status(400).json({ message: "Invalid phone number. Must be 10-15 digits." });
    }
    
    try {
        const db = await dbPromise;
        await db.run("INSERT INTO contacts (id, name, phone, email, tags) VALUES (?, ?, ?, ?, ?)", [id, name.trim(), normalizePhone(phone), email, tags]);
        res.status(201).json({ id, name, phone: normalizePhone(phone), email, tags });
    } catch (err) { 
        if (err.message.includes('UNIQUE constraint')) {
            return res.status(409).json({ message: "Contact with this phone number already exists." });
        }
        logger.error({ err }, "Failed to create contact"); 
        res.status(500).json({ message: "Error creating contact" }); 
    }
});

router.post('/contacts/bulk', async (req, res) => {
    const contacts = req.body;
    const db = await dbPromise;
    
    // Validate and normalize contacts
    const validContacts = [];
    const invalidPhones = [];
    const duplicates = [];
    
    // Get existing phones
    const existingPhones = new Set((await db.all("SELECT phone FROM contacts")).map(c => c.phone));
    
    for (const c of contacts) {
        if (!isValidPhone(c.phone)) {
            invalidPhones.push(c.phone || '(empty)');
            continue;
        }
        
        const normalized = normalizePhone(c.phone);
        
        if (existingPhones.has(normalized)) {
            duplicates.push(normalized);
            continue;
        }
        
        validContacts.push({
            ...c,
            id: c.id || `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            phone: normalized
        });
        
        existingPhones.add(normalized);
    }
    
    if (validContacts.length === 0) {
        return res.status(400).json({ 
            message: 'No valid contacts to import.',
            imported: 0,
            skipped: invalidPhones.length + duplicates.length,
            invalidPhones: invalidPhones.length,
            duplicates: duplicates.length
        });
    }
    
    const stmt = await db.prepare("INSERT INTO contacts (id, name, phone, email, tags) VALUES (?, ?, ?, ?, ?)");
    try {
        await db.run('BEGIN TRANSACTION');
        for (const c of validContacts) {
            await stmt.run(c.id, c.name, c.phone, c.email || '', c.tags || '');
        }
        await db.run('COMMIT');
        
        const totalSkipped = invalidPhones.length + duplicates.length;
        res.status(201).json({ 
            message: `Contacts imported successfully.`,
            imported: validContacts.length,
            skipped: totalSkipped,
            invalidPhones: invalidPhones.length,
            duplicates: duplicates.length
        });
    } catch (err) {
        await db.run('ROLLBACK');
        logger.error({ err }, "Failed to bulk import contacts");
        res.status(500).json({ message: 'Error importing contacts.' });
    } finally {
        await stmt.finalize();
    }
});

router.put('/contacts/:id', async (req, res) => {
    const { name, phone, email, tags } = req.body;
    
    if (!isValidPhone(phone)) {
        return res.status(400).json({ message: "Invalid phone number. Must be 10-15 digits." });
    }
    
    try {
        const db = await dbPromise;
        await db.run("UPDATE contacts SET name = ?, phone = ?, email = ?, tags = ? WHERE id = ?", name, normalizePhone(phone), email, tags, req.params.id);
        res.json({ id: req.params.id, name, phone: normalizePhone(phone), email, tags });
    } catch (err) { 
        if (err.message.includes('UNIQUE constraint')) {
            return res.status(409).json({ message: "Contact with this phone number already exists." });
        }
        logger.error({ err }, "Failed to update contact"); 
        res.status(500).json({ message: "Error updating contact" }); 
    }
});

router.delete('/contacts/:id', async (req, res) => {
    try {
        const db = await dbPromise;
        await db.run("DELETE FROM contacts WHERE id = ?", req.params.id);
        res.status(204).send();
    } catch (err) { logger.error({ err }, "Failed to delete contact"); res.status(500).json({ message: "Error deleting contact" }); }
});

// CONTACT OPT STATUS TOGGLE
router.put('/contacts/:id/opt-status', async (req, res) => {
    const { optedIn } = req.body;
    const db = await dbPromise;
    
    try {
        const now = new Date().toISOString();
        if (optedIn) {
            await db.run(
                "UPDATE contacts SET optedIn = 1, optedInAt = ? WHERE id = ?",
                now,
                req.params.id
            );
        } else {
            await db.run(
                "UPDATE contacts SET optedIn = 0, optedOutAt = ? WHERE id = ?",
                now,
                req.params.id
            );
        }
        
        const contact = await db.get("SELECT * FROM contacts WHERE id = ?", req.params.id);
        res.json(contact);
    } catch (err) { 
        logger.error({ err }, "Failed to update opt status"); 
        res.status(500).json({ message: "Error updating opt status" }); 
    }
});

// BULK OPT STATUS
router.put('/contacts/bulk/opt-status', async (req, res) => {
    const { contactIds, optedIn } = req.body;
    const db = await dbPromise;
    
    try {
        const now = new Date().toISOString();
        if (optedIn) {
            await db.run(
                `UPDATE contacts SET optedIn = 1, optedInAt = ? WHERE id IN (${contactIds.map(() => '?').join(',')})`,
                now, ...contactIds
            );
        } else {
            await db.run(
                `UPDATE contacts SET optedIn = 0, optedOutAt = ? WHERE id IN (${contactIds.map(() => '?').join(',')})`,
                now, ...contactIds
            );
        }
        
        res.json({ success: true, updated: contactIds.length });
    } catch (err) { 
        logger.error({ err }, "Failed to bulk update opt status"); 
        res.status(500).json({ message: "Error updating opt status" }); 
    }
});

// GROUPS
router.post('/groups', async (req, res) => {
    const { id, name, contactIds } = req.body;
    const db = await dbPromise;
    try {
        await db.run('BEGIN TRANSACTION');
        await db.run("INSERT INTO groups (id, name) VALUES (?, ?)", id, name);
        const stmt = await db.prepare("INSERT INTO group_contacts (group_id, contact_id) VALUES (?, ?)");
        for (const contactId of contactIds) {
            await stmt.run(id, contactId);
        }
        await stmt.finalize();
        await db.run('COMMIT');
        res.status(201).json({ id, name, contactIds });
    } catch (err) { await db.run('ROLLBACK'); logger.error({ err }, "Failed to create group"); res.status(500).json({ message: "Error creating group" }); }
});

router.put('/groups/:id', async (req, res) => {
    const { name, contactIds } = req.body;
    const groupId = req.params.id;
    const db = await dbPromise;
    try {
        await db.run('BEGIN TRANSACTION');
        await db.run("UPDATE groups SET name = ? WHERE id = ?", name, groupId);
        await db.run("DELETE FROM group_contacts WHERE group_id = ?", groupId);
        const stmt = await db.prepare("INSERT INTO group_contacts (group_id, contact_id) VALUES (?, ?)");
        for (const contactId of contactIds) {
            await stmt.run(groupId, contactId);
        }
        await stmt.finalize();
        await db.run('COMMIT');
        res.json({ id: groupId, name, contactIds });
    } catch (err) { await db.run('ROLLBACK'); logger.error({ err }, "Failed to update group"); res.status(500).json({ message: "Error updating group" }); }
});

router.delete('/groups/:id', async (req, res) => {
    try {
        const db = await dbPromise;
        await db.run("DELETE FROM groups WHERE id = ?", req.params.id);
        res.status(204).send();
    } catch (err) { logger.error({ err }, "Failed to delete group"); res.status(500).json({ message: "Error deleting group" }); }
});

// TEMPLATES
router.post('/templates', async (req, res) => {
    const { id, name, message, attachment, createdAt } = req.body;
    try {
        const db = await dbPromise;
        await db.run("INSERT INTO campaign_templates (id, name, message, attachment, createdAt) VALUES (?, ?, ?, ?, ?)", id, name, message, JSON.stringify(attachment), createdAt);
        res.status(201).json(req.body);
    } catch (err) { logger.error({ err }, "Failed to create template"); res.status(500).json({ message: "Error creating template" }); }
});

router.put('/templates/:id', async (req, res) => {
    const { name, message, attachment } = req.body;
    try {
        const db = await dbPromise;
        await db.run("UPDATE campaign_templates SET name = ?, message = ?, attachment = ? WHERE id = ?", name, message, JSON.stringify(attachment), req.params.id);
        res.json(req.body);
    } catch (err) { logger.error({ err }, "Failed to update template"); res.status(500).json({ message: "Error updating template" }); }
});

router.delete('/templates/:id', async (req, res) => {
    try {
        const db = await dbPromise;
        await db.run("DELETE FROM campaign_templates WHERE id = ?", req.params.id);
        res.status(204).send();
    } catch (err) { logger.error({ err }, "Failed to delete template"); res.status(500).json({ message: "Error deleting template" }); }
});

// SETTINGS
router.put('/settings', async (req, res) => {
    const { messagesPerHour } = req.body;
    try {
        const db = await dbPromise;
        await db.run("UPDATE settings SET value = ? WHERE key = 'messagesPerHour'", messagesPerHour);
        res.json({ messagesPerHour });
    } catch (err) { logger.error({ err }, "Failed to update settings"); res.status(500).json({ message: "Error updating settings" }); }
});

// BACKUP
router.get('/backup', async (req, res) => {
    try {
        const db = await dbPromise;
        const [contacts, groups, templates, runs, reports, settings] = await Promise.all([
            db.all("SELECT * FROM contacts"), db.all("SELECT * FROM groups"), db.all("SELECT * FROM campaign_templates"),
            db.all("SELECT * FROM campaign_runs"), db.all("SELECT * FROM reports"), db.all("SELECT * FROM settings"),
            db.all("SELECT * FROM group_contacts")
        ]);
        res.json({ contacts, groups, templates, runs, reports, settings, group_contacts: (await db.all("SELECT * FROM group_contacts")) });
    } catch (err) { logger.error({ err }, "Backup failed"); res.status(500).json({ message: "Error creating backup" }); }
});

router.post('/backup', async (req, res) => {
    const { contacts, groups, templates, runs, reports, settings, group_contacts } = req.body;
    const db = await dbPromise;
    try {
        await db.run('BEGIN TRANSACTION');
        // Clear all data
        await Promise.all(['group_contacts', 'contacts', 'groups', 'reports', 'campaign_runs', 'campaign_templates', 'settings'].map(t => db.run(`DELETE FROM ${t}`)));

        // Insert new data
        const statements = {
            contact: await db.prepare("INSERT INTO contacts (id, name, phone, email, tags) VALUES (?, ?, ?, ?, ?)"),
            group: await db.prepare("INSERT INTO groups (id, name) VALUES (?, ?)"),
            template: await db.prepare("INSERT INTO campaign_templates (id, name, message, attachment, createdAt) VALUES (?, ?, ?, ?, ?)"),
            run: await db.prepare("INSERT INTO campaign_runs (id, campaignTemplateId, targetGroupIds, status, createdAt) VALUES (?, ?, ?, ?, ?)"),
            report: await db.prepare("INSERT INTO reports (campaignRunId, totalContacts, sent, delivered, read, failed, progress) VALUES (?, ?, ?, ?, ?, ?, ?)"),
            setting: await db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)"),
            group_contact: await db.prepare("INSERT INTO group_contacts (group_id, contact_id) VALUES (?, ?)")
        };

        for (const c of contacts) await statements.contact.run(c.id, c.name, c.phone, c.email, c.tags);
        for (const g of groups) await statements.group.run(g.id, g.name);
        for (const t of templates) await statements.template.run(t.id, t.name, t.message, t.attachment, t.createdAt);
        for (const r of runs) await statements.run.run(r.id, r.campaignTemplateId, r.targetGroupIds, r.status, r.createdAt);
        for (const r of reports) await statements.report.run(r.campaignRunId, r.totalContacts, r.sent, r.delivered, r.read, r.failed, r.progress);
        for (const s of settings) await statements.setting.run(s.key, s.value);
        for (const gc of group_contacts) await statements.group_contact.run(gc.group_id, gc.contact_id);

        await Promise.all(Object.values(statements).map(s => s.finalize()));
        await db.run('COMMIT');
        res.status(200).json({ message: 'Restore successful.' });
    } catch (err) {
        await db.run('ROLLBACK');
        logger.error({ err }, "Restore failed");
        res.status(500).json({ message: 'Error restoring from backup.' });
    }
});


module.exports = router;
