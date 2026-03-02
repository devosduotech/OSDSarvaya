# OSDSarvaya - WhatsApp Bulk Messaging Software

## User Manual & Documentation

---

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [License Activation](#license-activation)
4. [First Time Setup](#first-time-setup)
5. [Login](#login)
6. [Connecting WhatsApp](#connecting-whatsapp)
7. [Managing Contacts](#managing-contacts)
8. [Managing Groups](#managing-groups)
9. [Creating Campaign Templates](#creating-campaign-templates)
10. [Running Campaigns](#running-campaigns)
11. [Dashboard & Analytics](#dashboard--analytics)
12. [Opt-IN/OUT Management](#opt-inout-management)
13. [Message Settings](#message-settings)
14. [Backup & Restore](#backup--restore)
15. [Troubleshooting](#troubleshooting)
16. [FAQ](#faq)

---

## Introduction

OSDSarvaya is a powerful WhatsApp bulk messaging application that allows businesses to send personalized messages to their customers at scale. With features like scheduled campaigns, contact management, and detailed analytics, OSDSarvaya simplifies your WhatsApp marketing efforts.

### Key Features

- **Bulk Messaging** - Send messages to thousands of contacts at once
- **Scheduled Campaigns** - Schedule messages to be sent at a specific time
- **Contact Management** - Import and organize contacts with tags
- **Personalization** - Use variables like {{name}} for personalized messages
- **Rich Media** - Send images, videos, and PDF documents
- **Analytics** - Track campaign performance with detailed reports
- **Offline Support** - 24-hour grace period for license validation

---

## Installation

### System Requirements

- **Operating System**: Windows 10/11 or Ubuntu (via Docker)
- **RAM**: 4 GB minimum (8 GB recommended)
- **Storage**: 2 GB free space
- **Internet**: Stable internet connection required

### Windows Installation

1. Download the installer (`OSDSarvayaSetup.exe`)
2. Run the installer
3. Follow the on-screen instructions
4. Launch OSDSarvaya from the desktop shortcut

### Docker Installation (Ubuntu)

```bash
# Clone the repository
git clone https://github.com/devosduotech/OSDSarvaya.git
cd OSDSarvaya

# Create production.env file
cp .env.example production.env
# Edit production.env with your ERPNext credentials

# Build and run
docker compose up -d
```

Access the application at `http://localhost:3001`

---

## License Activation

OSDSarvaya requires a valid license to operate.

### Activation Steps

1. Launch OSDSarvaya
2. Enter your **License Key** (format: `OXDS-XXXX-XXXX-XXXX-XXXX`)
3. Enter the **Email Address** associated with your license
4. Click **Activate License**

### Important Notes

- The license is tied to your machine (machine ID)
- If you change computers, contact support for license transfer
- There's a 24-hour grace period for offline license validation

---

## First Time Setup

On first launch, create your admin account:

1. Enter a **username** (minimum 3 characters)
2. Enter a **password** meeting these requirements:
   - At least 8 characters long
   - At least 1 uppercase letter (A-Z)
   - At least 1 numeric digit (0-9)
3. Confirm your password
4. Click **Create Admin Account**

> ⚠️ **Important**: Remember your credentials! There is no password recovery option.

---

## Login

After setup, log in with your admin credentials:

1. Enter your **username**
2. Enter your **password**
3. Click **Login**

> **Note**: Session lasts for 7 days. After that, you'll need to log in again.

---

## Connecting WhatsApp

To send messages, connect your WhatsApp account:

1. Navigate to **Settings**
2. Find the WhatsApp connection section
3. Click **Connect WhatsApp**
4. Open WhatsApp on your phone
5. Go to **Settings > Linked Devices**
6. Tap **Link a Device**
7. Scan the QR code displayed in OSDSarvaya

### Tips

- Keep your phone connected to the internet while sending messages
- The QR code refreshes every few seconds
- If it expires, wait for a new one

### Changing WhatsApp Number - Future Plan

To connect a different WhatsApp number:

1. Go to **Settings**
2. Find the WhatsApp connection section
3. Click **Disconnect** to log out from the current number
4. Click **Connect** to scan a new QR code

Your contacts, groups, campaigns, and license will be preserved.

---

## Managing Contacts

### Add Contact Manually

1. Go to **Contacts** page
2. Click **Add Contact**
3. Fill in details:
   - **Name** (required)
   - **Phone** (required) - include country code (e.g., 919999999999)
   - **Email** (optional)
   - **Tags** (optional) - for categorization
4. Click **Save**

### Import from CSV

1. Go to **Contacts** page
2. Click **Import**
3. Select a CSV file
4. The system will auto-detect columns:
   - Name
   - Phone
   - Email
   - Tags
5. Click **Import**

### CSV Format Example

```csv
Name,Phone,Email,Tags
John Doe,919999999999,john@example.com,Customer
Jane Smith,918888888888,jane@example.com,Lead
```

> **Tip**: Phone numbers should include country code (e.g., 91 for India)

---

## Managing Groups

Groups help organize contacts for targeted campaigns.

### Create a Group

1. Go to **Groups** page
2. Click **Create Group**
3. Enter a group name
4. Select contacts to add
5. Click **Save**

### Edit a Group

1. Go to **Groups** page
2. Click the edit icon next to a group
3. Add or remove contacts
4. Click **Save**

---

## Creating Campaign Templates

Templates save your message content for reuse.

### Create a Template

1. Go to **Campaigns** page
2. Click **New Template**
3. Enter a template name
4. Compose your message
5. Optionally attach files:
   - Images: JPEG, PNG, GIF, WebP
   - Videos: MP4, 3GPP, QuickTime
   - Documents: PDF
   - Maximum file size: 10MB
6. Click **Save Template**

### Personalization Variables

Use variables to personalize messages:

| Variable | Description |
|---------|-------------|
| `{{name}}` | Contact's name |
| `{{phone}}` | Contact's phone number |
| `{{email}}` | Contact's email |

**Example:**

```
Hello {{name}},

Thank you for your interest in our services!
```

---

## Running Campaigns

### Send Immediately

1. Find your saved template in the Campaigns list
2. Click the **Send** button (paper plane icon)
3. Select one or more target groups
4. Click **Send Now**

### Schedule for Later - Work In Progress

1. Find your saved template in the Campaigns list
2. Click the **Send** button
3. Check **Schedule for later**
4. Select date and time (in your local timezone)
5. Click **Schedule**

> **Note**: Scheduled campaigns will run automatically at the specified time, even if the app is closed.

### Monitor Campaign

- View progress in the Dashboard
- See live updates in the Activity section
- Campaign status: Sending → Sent/Failed

---

## Dashboard & Analytics

The dashboard shows your campaign performance:

### Campaign History

- View past campaigns
- See sent/failed message counts
- Check campaign dates and times

### Live Activity

- Real-time updates on running campaigns
- Progress percentage
- Messages sent/failed

### How to View

1. Go to **Dashboard**
2. Select a campaign from the dropdown
3. View detailed statistics

---

## Opt-IN/OUT Management

Respect your contacts' messaging preferences.

### Status Types

- **OPTED IN** (green) - Will receive messages
- **OPTED OUT** (red) - Will NOT receive messages

### Managing Status

- Click the **OPT** button to toggle status
- Only opted-in contacts will receive messages

### Automatic Opt-Out

When contacts reply with:
- **STOP**
- **UNSUBSCRIBE**

They will be automatically opted out.

### Automatic Opt-In

When contacts reply with:
- **START**
- **OPTIN**
- **SUBSCRIBE**

They will be automatically opted in.

> ⚠️ **Important**: Always respect opt-out requests to comply with regulations.

---

## Message Settings

Configure sending behavior in **Settings**:

### Messages per Hour

- Default: 65 messages/hour
- Lower this if WhatsApp blocks your messages

### Retry Failed Messages

- Default: 3 retry attempts
- Automatically retries failed messages

### How to Change

1. Go to **Settings**
2. Find **Message Settings**
3. Adjust the values
4. Changes apply immediately

---

## Backup & Restore

Keep your data safe with regular backups.

### Export Data

1. Go to **Settings**
2. Find **Backup & Restore** section
3. Click **Export Data**
4. Save the JSON file to a secure location

### Import Data

1. Go to **Settings**
2. Find **Backup & Restore** section
3. Click **Import Data**
4. Select your backup JSON file
5. Confirm to restore

> ⚠️ **Warning**: Importing will replace all existing contacts, groups, and templates.

---

## Troubleshooting

### WhatsApp Not Connecting

- Make sure your phone has internet connection
- Check if WhatsApp Web is already active on your phone
- Try logging out from WhatsApp Web on your phone first
- Restart the application

### Messages Not Sending

- Check if contacts are opted-in
- Verify phone numbers include country code
- Lower the messages per hour in settings
- Check WhatsApp connection status

### Campaign Stuck

- Click **Stop Campaign** button
- Restart the application
- Try running the campaign again

### Scheduled Campaign Not Running

- Make sure the application is running
- Check that the scheduled time has passed
- Verify WhatsApp is connected

---

## FAQ

### Is my data secure?

Yes, all data is stored locally on your machine. No data is sent to external servers except for license validation.

### Can I use multiple WhatsApp accounts?

Currently, only one WhatsApp account per installation is supported.

### What happens if my internet disconnects?

The campaign will pause and automatically resume when internet is restored. There's a 24-hour grace period for offline license validation.

### Can I transfer my license to another computer?

Contact support for license transfer. Licenses are tied to machine ID for security.

### How do I update the application?

Download the latest installer and run it. Your data will be preserved.

### What file formats are supported?

- **Images**: JPEG, PNG, GIF, WebP
- **Videos**: MP4, 3GPP, QuickTime
- **Documents**: PDF
- **Maximum file size**: 10MB

### How can I get support?

Contact our support team:
- **Email**: support@osduotech.com

---

## License Information

- **Version**: 1.1.5
- **Developer**: OSDuo Tech
- **Website**: www.osduotech.com

---

*Last Updated: March 2026*
