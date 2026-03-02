# OSDSarvaya - Future Feature Roadmap

> Document created: March 2026
> Version: 1.1.6 (Stable)

---

## 1. Update & Distribution System

### 1.1 Goal
Enable perpetual license distribution with optional customer-controlled updates:
- Silent update checks (configurable interval, default: 10 days)
- In-app notification only (no system toast/push notifications)
- Customer confirms before updating
- All user data preserved during update

### 1.2 Distribution Options

| Option | Pros | Cons |
|--------|------|------|
| **GitHub Releases** | Free, built-in versioning, easy setup | Public releases |
| **Self-hosted (ERPNext)** | Full control, private | Need hosting infrastructure |

**Recommendation:** Start with GitHub Releases, migrate to self-hosted when needed

### 1.3 Implementation Design

#### Version Endpoint Schema
```json
{
  "version": "1.1.6",
  "minVersion": "1.1.0",
  "releaseNotes": "Bug fixes and improvements",
  "downloadUrl": "https://github.com/devosduotech/OSDSarvaya/releases/download/v1.1.6/OSDSarvayaSetup.exe",
  "releaseDate": "2026-03-02"
}
```

#### Update Check Flow
```
App Startup → Check if (currentTime - lastUpdateCheck) > 10 days
    ↓
Fetch version.json from endpoint
    ↓
If newer version exists → Set updateAvailable = true
    ↓
Show subtle in-app notification (badge/icon) in navbar
    ↓
User clicks notification → Show modal with release notes
    ↓
User clicks "Update" → Download installer → Launch → Close app
```

#### Implementation Phases

**Phase 1: Backend**
- Create version.json endpoint (GitHub API or self-hosted)
- Add update check endpoint to server API (optional)

**Phase 2: Frontend**
- Add UpdateContext for state management
- Implement update check service (runs on app start)
- Create UpdateNotification component (subtle badge)
- Create UpdateModal component (release notes + confirm button)
- Add "Check for Updates" button in Settings

**Phase 3: Installer**
- Configure electron-builder to preserve user data during reinstall
- Ensure `%APPDATA%/OSDSarvaya` folder is not wiped on update

### 1.4 Technical Notes
- Use electron-updater or custom fetch + download approach
- Store `lastUpdateCheck` timestamp in electron-store
- Check happens on app start only (not while running)
- All data (contacts, groups, campaigns, license) preserved during update

---

## 2. WhatsApp Multi-Device Support

### 2.1 Goal
Allow connecting multiple WhatsApp numbers to the same application.

### 2.2 Current Status
- Currently supports only one WhatsApp account per installation

### 2.3 Proposed Design
- Add "WhatsApp Accounts" management section in Settings
- Allow adding up to N WhatsApp numbers (configurable, default: 3)
- Each account has its own session storage
- Campaign creation allows selecting which WhatsApp number to use
- Track sending statistics per account

### 2.4 Implementation Notes
- Need separate session folders for each account: `.wwebjs_auth_1`, `.wwebjs_auth_2`, etc.
- Modify campaign sending to accept `whatsappAccountId` parameter
- UI: Dropdown in campaign form to select WhatsApp account

---

## 3. Scheduled Campaign Improvements

### 3.1 Recurring Campaigns
- Allow scheduling campaigns to repeat:
  - Daily, Weekly, Monthly
  - Specific days of week
  - Custom intervals
- Store recurrence pattern in campaign record
- Auto-generate next run when current campaign completes

### 3.2 Campaign Templates
- Save frequently used group selections as templates
- Quick-launch campaigns from templates

---

## 4. Message Personalization Enhancements

### 4.1 Dynamic Variables
Current: `{{name}}`, `{{phone}}`

Add more:
- `{{company}}` - from contact field
- `{{email}}` - from contact field
- `{{custom1}}` to `{{custom10}}` - custom fields
- `{{lastMessage}}` - last message received from contact
- `{{campaignName}}` - current campaign name
- `{{date}}` - current date (customizable format)
- `{{time}}` - current time

### 4.2 Conditional Content
```
{{#if hasUnread}}
You have unread messages!
{{else}}
Check out our new products!
{{/if}}
```

---

## 5. Advanced Contact Management

### 5.1 Contact Fields
Add more fields to contacts:
- Company name
- Email
- Address
- Custom fields (up to 10)

### 5.2 Import from ERPNext
- Pull contacts directly from ERPNext
- Map ERPNext fields to OSDSarvaya contact fields
- Sync contacts on schedule

### 5.3 Contact Tagging
- Add tags to contacts
- Filter campaigns by tags
- Bulk tag operations

---

## 6. Analytics & Reporting

### 6.1 Dashboard Enhancements
- Message delivery rate charts
- Failed message analysis
- Best sending times heatmap
- Campaign comparison

### 6.2 Export Reports
- Export campaign reports as PDF/Excel
- Scheduled report generation
- Email reports to admin

---

## 7. API & Integrations

### 7.1 REST API
Expose APIs for external integrations:
- `POST /api/campaigns` - Create campaign
- `GET /api/contacts` - List contacts
- `POST /api/contacts/import` - Import contacts
- `GET /api/reports/{campaignId}` - Get campaign report

### 7.2 Webhook Notifications
- Send webhook when campaign completes
- Include statistics in webhook payload
- Configurable webhook URL in Settings

---

## 8. Mobile App (Future)

- Companion mobile app to monitor campaigns
- Push notifications for campaign status
- Quick actions (pause/resume campaign)

---

## Priority Order

| Priority | Feature | Complexity |
|----------|---------|------------|
| 1 | Update Distribution System | Medium |
| 2 | WhatsApp Multi-Device | Medium |
| 3 | Recurring Campaigns | Low |
| 4 | Dynamic Variables Expansion | Low |
| 5 | Contact Field Enhancements | Low |
| 6 | Advanced Analytics | High |
| 7 | REST API | Medium |
| 8 | Mobile App | High |

---

## Notes

- All features should maintain backward compatibility
- License validation should work across updates
- User data must always be preserved during updates
- Consider ERPNext integration for enterprise customers
