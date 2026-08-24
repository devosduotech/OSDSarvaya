import React, { useState } from 'react';
import Card from '../components/ui/Card';

const Help: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('license');

  const sections = [
    {
      id: 'license',
      title: 'License Activation',
      content: `
        <p class="mb-4">OSDSarvaya requires a valid license to operate. On first launch, you'll need to activate your license:</p>
        <ol class="list-decimal list-inside space-y-2 ml-2">
          <li>Enter your <strong>License Key</strong> (format: OSDS-XXXX-XXXX-XXXX-XXXX)</li>
          <li>Enter the <strong>Email Address</strong> associated with your license</li>
          <li>Click <strong>Activate License</strong></li>
        </ol>
        <p class="mt-4 text-yellow-400">Important: The license is tied to your machine. If you change computers, contact support for license transfer.</p>
        <p class="mt-2 text-gray-400">Your machine ID is automatically generated from hardware identifiers for security purposes.</p>
      `
    },
    {
      id: 'setup',
      title: 'First Time Setup',
      content: `
        <p class="mb-4">On first launch, you'll need to create an admin account:</p>
        <ol class="list-decimal list-inside space-y-2 ml-2">
          <li>Enter a <strong>username</strong> (minimum 3 characters)</li>
          <li>Enter a <strong>password</strong> that meets these requirements:</li>
          <ul class="list-disc list-inside ml-4 space-y-1">
            <li>At least 8 characters long</li>
            <li>At least 1 uppercase letter (A-Z)</li>
            <li>At least 1 numeric digit (0-9)</li>
          </ul>
          <li>Confirm your password</li>
          <li>Click <strong>Create Admin Account</strong></li>
        </ol>
        <p class="mt-4 text-yellow-400">Important: Remember your credentials! There is no password recovery.</p>
      `
    },
    {
      id: 'login',
      title: 'Login',
      content: `
        <p class="mb-4">After setup, use your admin credentials to log in:</p>
        <ol class="list-decimal list-inside space-y-2 ml-2">
          <li>Enter your <strong>username</strong></li>
          <li>Enter your <strong>password</strong></li>
          <li>Click <strong>Login</strong></li>
        </ol>
        <p class="mt-4 text-yellow-400">Note: Session lasts for 7 days. After that, you'll need to log in again.</p>
      `
    },
    {
      id: 'whatsapp',
      title: 'Connecting WhatsApp',
      content: `
        <p class="mb-4">To send messages, you need to connect your WhatsApp account:</p>
        <ol class="list-decimal list-inside space-y-2 ml-2">
          <li>Navigate to <strong>Settings</strong> page</li>
          <li>Look for the WhatsApp connection section</li>
          <li>Click <strong>Connect WhatsApp</strong> button</li>
          <li>Scan the QR code with your WhatsApp mobile app</li>
          <li>Wait for the "Connected" status</li>
        </ol>
        <p class="mt-4 text-yellow-400">Note: Keep your phone connected to the internet while sending messages.</p>
        <p class="mt-2 text-gray-400">The QR code refreshes every few seconds. If it expires, wait for a new one.</p>
      `
    },
    {
      id: 'contacts',
      title: 'Managing Contacts',
      content: `
        <p class="mb-4">You can add contacts manually or import from a file:</p>
        <h4 class="font-semibold mt-3 mb-2 text-white">Add Manually:</h4>
        <ol class="list-decimal list-inside space-y-1 ml-2">
          <li>Go to <strong>Contacts</strong> page</li>
          <li>Click <strong>Add Contact</strong> button</li>
          <li>Fill in name, phone number, email (optional), and tags (optional)</li>
          <li>Click <strong>Save</strong></li>
        </ol>
        <h4 class="font-semibold mt-3 mb-2 text-white">Import from CSV:</h4>
        <ol class="list-decimal list-inside space-y-1 ml-2">
          <li>Go to <strong>Contacts</strong> page</li>
          <li>Click <strong>Import</strong> button</li>
          <li>Select a CSV file</li>
          <li>The system will auto-detect columns (Name, Phone, Email, Tags)</li>
          <li>Click <strong>Import</strong> to add all contacts</li>
        </ol>
        <div class="mt-4 p-3 bg-green-900/30 border border-green-500 rounded">
          <p class="text-green-300"><strong>Tip:</strong> Phone numbers should include country code (e.g., 919999999999 for India)</p>
        </div>
      `
    },
    {
      id: 'groups',
      title: 'Managing Groups',
      content: `
        <p class="mb-4">Groups help you organize contacts for targeted campaigns:</p>
        <ol class="list-decimal list-inside space-y-2 ml-2">
          <li>Go to <strong>Groups</strong> page</li>
          <li>Click <strong>Create Group</strong></li>
          <li>Enter a group name</li>
          <li>Select contacts to add to the group</li>
          <li>Click <strong>Save</strong></li>
        </ol>
        <p class="mt-4">You can edit groups to add or remove contacts at any time by clicking the edit icon.</p>
      `
    },
    {
      id: 'templates',
      title: 'Creating Campaign Templates',
      content: `
        <p class="mb-4">Campaign templates save your message content for reuse:</p>
        <ol class="list-decimal list-inside space-y-2 ml-2">
          <li>Go to <strong>Campaigns</strong> page</li>
          <li>Click <strong>New Template</strong></li>
          <li>Enter a template name</li>
          <li>Compose your message in the message box</li>
          <li>Optionally attach images, videos, or PDFs (max 10MB)</li>
          <li>Click <strong>Save Template</strong></li>
        </ol>
        <h4 class="font-semibold mt-4 mb-2 text-white">Using Variables:</h4>
        <p class="mb-2">You can use <code class="bg-gray-700 px-1 rounded">{'{{name}}'}</code> to personalize messages:</p>
        <ul class="list-disc list-inside ml-2 space-y-1">
          <li><code class="bg-gray-700 px-1 rounded">{'{{name}}'}</code> - Contact's name</li>
          <li><code class="bg-gray-700 px-1 rounded">{'{{phone}}'}</code> - Contact's phone number</li>
          <li><code class="bg-gray-700 px-1 rounded">{'{{email}}'}</code> - Contact's email</li>
        </ul>
        <div class="mt-4 p-3 bg-blue-900/30 border border-blue-500 rounded">
          <p class="text-blue-300">Example: "Hello {'{{name}}'}, thank you for your interest in our services!"</p>
        </div>
      `
    },
    {
      id: 'campaigns',
      title: 'Running Campaigns',
      content: `
        <p class="mb-4">Send bulk messages to your contact groups:</p>
        <h4 class="font-semibold mt-3 mb-2 text-white">Immediate Send:</h4>
        <ol class="list-decimal list-inside space-y-1 ml-2">
          <li>Find your saved template in the Campaigns list</li>
          <li>Click the <strong>Send</strong> button (paper plane icon)</li>
          <li>Select one or more target groups</li>
          <li>Click <strong>Send Now</strong> to start immediately</li>
        </ol>
        <h4 class="font-semibold mt-4 mb-2 text-white">Schedule for Later:</h4>
        <ol class="list-decimal list-inside space-y-1 ml-2">
          <li>Find your saved template in the Campaigns list</li>
          <li>Click the <strong>Send</strong> button</li>
          <li>Check <strong>Schedule for later</strong></li>
          <li>Select date and time (in your local timezone)</li>
          <li>Click <strong>Schedule</strong></li>
        </ol>
        <p class="mt-4 text-yellow-400">Note: Scheduled campaigns will run automatically when the time is reached, even if the app is closed.</p>
      `
    },
    {
      id: 'dashboard',
      title: 'Dashboard & Analytics',
      content: `
        <p class="mb-4">The dashboard shows your campaign performance:</p>
        <ul class="list-disc list-inside space-y-2 ml-2">
          <li><strong>Campaign History</strong> - View past campaigns with sent/failed counts</li>
          <li><strong>Live Activity</strong> - Real-time updates on running campaigns</li>
          <li><strong>Progress</strong> - See percentage complete and messages sent</li>
        </ul>
        <p class="mt-4">Select a campaign from the dropdown to see detailed statistics.</p>
      `
    },
    {
      id: 'opt-status',
      title: 'Opt-IN/OUT Management',
      content: `
        <p class="mb-4">Respect your contacts' preferences:</p>
        <ul class="list-disc list-inside space-y-2 ml-2">
          <li>Contacts start as <strong>OPTED IN</strong> by default</li>
          <li>Click the <strong>OPT</strong> button to toggle status</li>
          <li>Only opted-in contacts will receive messages</li>
          <li>When contacts reply <strong>STOP</strong> or <strong>UNSUBSCRIBE</strong>, they are automatically opted out</li>
          <li>When contacts reply <strong>START</strong> or <strong>OPTIN</strong>, they are automatically opted in</li>
        </ul>
        <p class="mt-4 text-yellow-400">Important: Always respect opt-out requests to comply with regulations.</p>
      `
    },
    {
      id: 'settings',
      title: 'Message Settings',
      content: `
        <p class="mb-4">Configure how messages are sent in <strong>Settings</strong>:</p>
        <ul class="list-disc list-inside space-y-2 ml-2">
          <li><strong>Messages per hour</strong>: Control sending speed (default: 30)</li>
          <li><strong>Retry failed</strong>: Automatically retry up to 3 times</li>
        </ul>
        <p class="mt-4">Lower the messages per hour if WhatsApp blocks your messages. We recommend staying below 40-50 msgs/hr to avoid restrictions.</p>
      `
    },
    {
      id: 'api-keys',
      title: 'API Keys',
      content: `
        <p class="mb-4">API Keys allow third-party applications (ERP systems, CRMs, custom scripts) to authenticate with OSDSarvaya and send WhatsApp notifications programmatically.</p>
        <h4 class="font-semibold mt-4 mb-2 text-white">Creating an API Key:</h4>
        <ol class="list-decimal list-inside space-y-1 ml-2">
          <li>Navigate to <strong>Settings</strong> → <strong>API Keys</strong> tab</li>
          <li>Click <strong>+ Create Key</strong></li>
          <li>Enter a descriptive name (e.g., "ERP Integration", "CRM Bot")</li>
          <li>Click <strong>Create</strong></li>
          <li><span class="text-red-400 font-semibold">Important:</span> Copy the API key immediately! You will not be able to see it again.</li>
        </ol>
        <h4 class="font-semibold mt-4 mb-2 text-white">Managing API Keys:</h4>
        <ul class="list-disc list-inside space-y-1 ml-2">
          <li><strong>Disable</strong> — Temporarily deactivate a key without deleting it</li>
          <li><strong>Enable</strong> — Reactivate a disabled key</li>
          <li><strong>Revoke</strong> — Permanently delete a key (cannot be undone)</li>
        </ul>
        <h4 class="font-semibold mt-4 mb-2 text-white">Using an API Key:</h4>
        <p class="mb-2">Include the API key in the <code class="bg-gray-700 px-1 rounded">x-api-key</code> HTTP header with every request:</p>
        <div class="mt-2 p-3 bg-gray-900 rounded border border-gray-600 font-mono text-sm text-green-300">
          <p>curl -X POST http://localhost:3001/api/notify/send \\</p>
          <p class="ml-4">-H "Content-Type: application/json" \\</p>
          <p class="ml-4">-H "x-api-key: osds_your_api_key_here" \\</p>
          <p class="ml-4">-d '{"to": ["919876543210"], "message": "Hello!"}'</p>
        </div>
        <div class="mt-4 p-3 bg-yellow-900/30 border border-yellow-500 rounded">
          <p class="text-yellow-300"><strong>Security:</strong> Treat API keys like passwords. Never share them publicly or commit them to version control.</p>
        </div>
      `
    },
    {
      id: 'notification-api',
      title: 'Notification API',
      content: `
        <p class="mb-4">The Notification API lets external applications send WhatsApp messages through OSDSarvaya. All endpoints require a valid API key in the <code class="bg-gray-700 px-1 rounded">x-api-key</code> header.</p>
        <h4 class="font-semibold mt-4 mb-2 text-white">1. Send Direct Message — POST /api/notify/send</h4>
        <p class="mb-2">Send a message to one or more phone numbers:</p>
        <div class="mt-2 p-3 bg-gray-900 rounded border border-gray-600 font-mono text-xs text-green-300 whitespace-pre">{
  "to": ["919876543210", "919123456789"],
  "message": "Hello {{name}}, your order is ready!",
  "variables": { "name": "John" },
  "attachment": { "url": "https://example.com/file.pdf", "name": "Invoice.pdf" },
  "externalId": "order-12345"
}</div>
        <p class="mt-3 text-gray-400 text-sm">Parameters:</p>
        <ul class="list-disc list-inside ml-2 space-y-1 text-sm text-gray-300">
          <li><strong>to</strong> (required) — Array of phone numbers with country code</li>
          <li><strong>message</strong> (required) — Message text. Supports <code class="bg-gray-700 px-1 rounded">{{name}}</code>, <code class="bg-gray-700 px-1 rounded">{{phone}}</code>, <code class="bg-gray-700 px-1 rounded">{{email}}</code> variables</li>
          <li><strong>variables</strong> (optional) — Key-value pairs for message personalization</li>
          <li><strong>attachment</strong> (optional) — Object with <code class="bg-gray-700 px-1 rounded">url</code> and <code class="bg-gray-700 px-1 rounded">name</code></li>
          <li><strong>externalId</strong> (optional) — Your own tracking ID for status lookups</li>
        </ul>
        <h4 class="font-semibold mt-6 mb-2 text-white">2. Send Bulk via Template — POST /api/notify/template</h4>
        <p class="mb-2">Send a pre-defined template to specific numbers:</p>
        <div class="mt-2 p-3 bg-gray-900 rounded border border-gray-600 font-mono text-xs text-green-300 whitespace-pre">{
  "templateId": "camp_1716400000000",
  "to": ["919876543210"],
  "variables": { "name": "John" },
  "externalId": "erp-order-456"
}</div>
        <h4 class="font-semibold mt-6 mb-2 text-white">3. Send Bulk via Group — POST /api/notify/bulk</h4>
        <p class="mb-2">Send a template to all contacts in a group:</p>
        <div class="mt-2 p-3 bg-gray-900 rounded border border-gray-600 font-mono text-xs text-green-300 whitespace-pre">{
  "groupId": "group_1716400000000",
  "templateId": "camp_1716400000000",
  "externalId": "erp-bulk-789"
}</div>
        <p class="mt-3 text-sm text-gray-300">If a campaign is already running, the bulk request is automatically queued and will start when the current campaign finishes.</p>
        <h4 class="font-semibold mt-6 mb-2 text-white">4. Check Status — GET /api/notify/status/:externalId</h4>
        <p class="mb-2">Check delivery status using the <code class="bg-gray-700 px-1 rounded">externalId</code> you provided:</p>
        <div class="mt-2 p-3 bg-gray-900 rounded border border-gray-600 font-mono text-sm text-green-300">GET /api/notify/status/order-12345</div>
        <h4 class="font-semibold mt-6 mb-2 text-white">5. Notification Logs — GET /api/notify/logs</h4>
        <p class="mb-2">View notification history with optional filters:</p>
        <div class="mt-2 p-3 bg-gray-900 rounded border border-gray-600 font-mono text-sm text-green-300">GET /api/notify/logs?page=1&limit=50&status=sent</div>
        <p class="mt-3 text-sm text-gray-300">Filter parameters: <code class="bg-gray-700 px-1 rounded">status</code>, <code class="bg-gray-700 px-1 rounded">apiKeyId</code>, <code class="bg-gray-700 px-1 rounded">fromDate</code>, <code class="bg-gray-700 px-1 rounded">toDate</code></p>
        <div class="mt-4 p-3 bg-blue-900/30 border border-blue-500 rounded">
          <p class="text-blue-300"><strong>Tip:</strong> Always use <code class="bg-gray-700 px-1 rounded">externalId</code> to track messages from your ERP system. This makes it easy to link notifications back to your orders, invoices, or records.</p>
        </div>
      `
    },
    {
      id: 'webhooks',
      title: 'Webhooks',
      content: `
        <p class="mb-4">Webhooks allow OSDSarvaya to push real-time event notifications to your external systems (ERP, CRM, etc.) when things happen — like messages being sent, campaigns completing, or message failures.</p>
        <h4 class="font-semibold mt-4 mb-2 text-white">Creating a Webhook:</h4>
        <ol class="list-decimal list-inside space-y-1 ml-2">
          <li>Navigate to <strong>Settings</strong> → <strong>Webhooks</strong> tab</li>
          <li>Click <strong>+ Create Webhook</strong></li>
          <li>Enter a <strong>name</strong> (e.g., "ERP Notification")</li>
          <li>Enter the <strong>URL</strong> of your endpoint that will receive the data (e.g., <code class="bg-gray-700 px-1 rounded">https://your-erp.com/api/webhooks/osdsarvaya</code>)</li>
          <li>Select the <strong>events</strong> you want to listen to</li>
          <li>Click <strong>Create</strong></li>
          <li><span class="text-red-400 font-semibold">Important:</span> Copy the webhook secret! You'll need it to verify payloads.</li>
        </ol>
        <h4 class="font-semibold mt-4 mb-2 text-white">Available Events:</h4>
        <ul class="list-disc list-inside ml-2 space-y-1">
          <li><code class="bg-gray-700 px-1 rounded">message.sent</code> — A message was successfully sent</li>
          <li><code class="bg-gray-700 px-1 rounded">message.failed</code> — A message failed to send</li>
          <li><code class="bg-gray-700 px-1 rounded">campaign.started</code> — A campaign started sending</li>
          <li><code class="bg-gray-700 px-1 rounded">campaign.completed</code> — A campaign finished all messages</li>
          <li><code class="bg-gray-700 px-1 rounded">campaign.stopped</code> — A campaign was manually stopped</li>
        </ul>
        <h4 class="font-semibold mt-4 mb-2 text-white">Webhook Payload Format:</h4>
        <div class="mt-2 p-3 bg-gray-900 rounded border border-gray-600 font-mono text-xs text-green-300 whitespace-pre">{
  "event": "message.sent",
  "timestamp": "2026-05-22T14:30:00.000Z",
  "data": {
    "messageId": "msg_919876543210",
    "recipientPhone": "919876543210",
    "recipientName": "John Doe",
    "status": "sent",
    "campaignRunId": "run_1716400000000"
  }
}</div>
        <h4 class="font-semibold mt-4 mb-2 text-white">Verifying Webhook Authenticity:</h4>
        <p class="mb-2">Each webhook delivery includes an HMAC-SHA256 signature in the headers. Verify it to ensure the request is from OSDSarvaya:</p>
        <ul class="list-disc list-inside ml-2 space-y-1">
          <li>Header: <code class="bg-gray-700 px-1 rounded">X-OSDSarvaya-Signature: sha256=&lt;hex_digest&gt;</code></li>
          <li>Header: <code class="bg-gray-700 px-1 rounded">X-OSDSarvaya-Event: message.sent</code></li>
        </ul>
        <p class="mt-3 text-sm text-gray-300">To verify: compute HMAC-SHA256 of the raw request body using your webhook secret, then compare with the signature header.</p>
        <h4 class="font-semibold mt-4 mb-2 text-white">Testing a Webhook:</h4>
        <p class="mb-2">Click the <strong>Test</strong> button next to any webhook to send a test payload to your endpoint. This helps verify your integration before going live.</p>
        <div class="mt-4 p-3 bg-yellow-900/30 border border-yellow-500 rounded">
          <p class="text-yellow-300"><strong>Retry Logic:</strong> If your endpoint is unavailable, OSDSarvaya will retry up to 3 times with increasing delays (1s, 5s, 25s).</p>
        </div>
      `
    },
    {
      id: 'erp-integration',
      title: 'ERP Integration Guide',
      content: `
        <p class="mb-4">OSDSarvaya can be integrated with any ERP system (SAP, Tally, Zoho, Frappe/ERPNext, etc.) using the API Keys and Webhooks features together.</p>
        <h4 class="font-semibold mt-4 mb-2 text-white">Typical Integration Flow:</h4>
        <div class="my-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
          <p class="text-white font-medium mb-2">Outbound (ERP → OSDSarvaya):</p>
          <ol class="list-decimal list-inside space-y-2 ml-2">
            <li>Create an <strong>API Key</strong> in OSDSarvaya Settings</li>
            <li>Your ERP calls OSDSarvaya's <strong>/api/notify/send</strong> or <strong>/api/notify/bulk</strong> with the API key</li>
            <li>OSDSarvaya sends the WhatsApp message(s)</li>
          </ol>
        </div>
        <div class="my-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
          <p class="text-white font-medium mb-2">Inbound (OSDSarvaya → ERP):</p>
          <ol class="list-decimal list-inside space-y-2 ml-2">
            <li>Create a <strong>Webhook</strong> in OSDSarvaya pointing to your ERP endpoint</li>
            <li>Select events like <code class="bg-gray-700 px-1 rounded">message.sent</code>, <code class="bg-gray-700 px-1 rounded">message.failed</code>, <code class="bg-gray-700 px-1 rounded">campaign.completed</code></li>
            <li>OSDSarvaya pushes event data to your ERP when messages are delivered or fail</li>
            <li>Your ERP updates order/invoice status based on delivery results</li>
          </ol>
        </div>
        <h4 class="font-semibold mt-4 mb-2 text-white">Example: Send Order Confirmation from ERPNext</h4>
        <div class="mt-2 p-3 bg-gray-900 rounded border border-gray-600 font-mono text-xs text-green-300 whitespace-pre">import requests

API_KEY = "osds_your_api_key_here"
OSDS_URL = "http://localhost:3001/api/notify/send"

payload = {
    "to": ["91" + customer_phone],
    "message": "Hello {{name}}, your order #{{order_id}} has been confirmed!",
    "variables": {
        "name": customer_name,
        "order_id": sales_order_name
    },
    "externalId": sales_order_name
}

response = requests.post(
    OSDS_URL,
    json=payload,
    headers={
        "Content-Type": "application/json",
        "x-api-key": API_KEY
    }
)

print(response.json())</div>
        <h4 class="font-semibold mt-6 mb-2 text-white">Example: Receive Delivery Status in ERPNext</h4>
        <div class="mt-2 p-3 bg-gray-900 rounded border border-gray-600 font-mono text-xs text-green-300 whitespace-pre">import hashlib, hmac, json
import frappe

@frappe.whitelist(allow_http=True)
def osdsarvaya_webhook():
    signature = frappe.request.headers.get(
        "X-OSDSarvaya-Signature", ""
    )
    event = frappe.request.headers.get(
        "X-OSDSarvaya-Event", ""
    )
    payload = frappe.request.get_json()

    # Verify signature
    secret = frappe.get_single_value(
        "OSDSarvaya Settings", "webhook_secret"
    )
    expected = "sha256=" + hmac.new(
        secret.encode(),
        frappe.request.data,
        hashlib.sha256
    ).hexdigest()

    if signature != expected:
        frappe.throw("Invalid signature")

    # Process event
    if event == "message.sent":
        external_id = payload.get("data", {}).get("externalId")
        # Update your Sales Order status
        frappe.db.set_value(
            "Sales Order", external_id,
            "osds_status", "WhatsApp Sent"
        )</div>
      `
    },
    {
      id: 'backup',
      title: 'Backup & Restore',
      content: `
        <p class="mb-4">Keep your data safe by creating regular backups:</p>
        <h4 class="font-semibold mt-3 mb-2 text-white">Export Data:</h4>
        <ol class="list-decimal list-inside space-y-1 ml-2">
          <li>Go to <strong>Settings</strong> page</li>
          <li>Find the <strong>Backup & Restore</strong> section</li>
          <li>Click <strong>Export Data</strong></li>
          <li>Save the JSON file to a secure location</li>
        </ol>
        <h4 class="font-semibold mt-3 mb-2 text-white">Import Data:</h4>
        <ol class="list-decimal list-inside space-y-1 ml-2">
          <li>Go to <strong>Settings</strong> page</li>
          <li>Find the <strong>Backup & Restore</strong> section</li>
          <li>Click <strong>Import Data</strong></li>
          <li>Select your backup JSON file</li>
          <li>Confirm to restore - this will overwrite existing data</li>
        </ol>
        <p class="mt-4 text-yellow-400">Warning: Importing will replace all existing contacts, groups, and templates.</p>
      `
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      content: `
        <h4 class="font-semibold mt-3 mb-2 text-white">WhatsApp Not Connecting:</h4>
        <ul class="list-disc list-inside space-y-1 ml-2 mb-4">
          <li>Make sure your phone has internet connection</li>
          <li>Check if WhatsApp Web is already active on your phone</li>
          <li>Try logging out from WhatsApp Web on your phone first</li>
          <li>Restart the application</li>
        </ul>
        <h4 class="font-semibold mt-3 mb-2 text-white">Messages Not Sending:</h4>
        <ul class="list-disc list-inside space-y-1 ml-2 mb-4">
          <li>Check if contacts are opted-in</li>
          <li>Verify phone numbers include country code</li>
          <li>Lower the messages per hour in settings</li>
          <li>Check WhatsApp connection status</li>
        </ul>
        <h4 class="font-semibold mt-3 mb-2 text-white">Campaign Stuck:</h4>
        <ul class="list-disc list-inside space-y-1 ml-2 mb-4">
          <li>Click <strong>Stop Campaign</strong> button</li>
          <li>Restart the application</li>
          <li>Try running the campaign again</li>
        </ul>
        <h4 class="font-semibold mt-3 mb-2 text-white">Scheduled Campaign Not Running:</h4>
        <ul class="list-disc list-inside space-y-1 ml-2">
          <li>Make sure the application is running (can be minimized)</li>
          <li>Check that the scheduled time has passed</li>
          <li>Verify WhatsApp is connected</li>
        </ul>
      `
    },
    {
      id: 'faq',
      title: 'FAQ',
      content: `
        <h4 class="font-semibold mt-3 mb-2 text-white">Is my data secure?</h4>
        <p class="ml-2 mb-4">Yes, all data is stored locally on your machine. No data is sent to external servers except for license validation.</p>
        
        <h4 class="font-semibold mt-3 mb-2 text-white">Can I use multiple WhatsApp accounts?</h4>
        <p class="ml-2 mb-4">Currently, only one WhatsApp account per installation is supported.</p>
        
        <h4 class="font-semibold mt-3 mb-2 text-white">What happens if my internet disconnects?</h4>
        <p class="ml-2 mb-4">The campaign will pause and automatically resume when internet is restored. There's a 24-hour grace period for offline license validation.</p>
        
        <h4 class="font-semibold mt-3 mb-2 text-white">Can I transfer my license to another computer?</h4>
        <p class="ml-2 mb-4">Contact support for license transfer. Licenses are tied to machine ID for security.</p>
        
        <h4 class="font-semibold mt-3 mb-2 text-white">How do I update the application?</h4>
        <p class="ml-2 mb-4">Download the latest installer and run it. Your data will be preserved.</p>
        
        <h4 class="font-semibold mt-3 mb-2 text-white">What file formats are supported for attachments?</h4>
        <p class="ml-2 mb-4">Images: JPEG, PNG, GIF, WebP<br/>Videos: MP4, 3GPP, QuickTime<br/>Documents: PDF<br/>Maximum file size: 10MB</p>
      `
    }
  ];

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 bg-slate-800 border-r border-slate-700 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">Help Topics</h2>
        <nav className="space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeSection === section.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-slate-700'
              }`}
            >
              {section.title}
            </button>
          ))}
        </nav>
        
        <div className="mt-8 p-4 bg-slate-700/50 rounded-lg">
          <h3 className="font-semibold text-white mb-2">Need More Help?</h3>
          <p className="text-sm text-gray-400">Contact our support team for assistance.</p>
          <p className="text-sm text-blue-400 mt-2">support@osduotech.com</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {sections.map((section) => (
          <div key={section.id} className={activeSection === section.id ? 'block' : 'hidden'}>
            <h1 className="text-3xl font-bold text-white mb-2">{section.title}</h1>
            <p className="text-gray-400 mb-8">Learn how to use OSDSarvaya</p>
            <Card>
              <div 
                className="text-gray-300 prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: section.content }}
              />
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Help;
