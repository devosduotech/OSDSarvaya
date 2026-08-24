import React, { useState } from 'react';
import Card from '../components/ui/Card';
import { ChevronDownIcon, ChevronUpIcon } from '../components/icons/Icons';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      question: 'How do I activate my license?',
      answer: `On first launch, you'll see a License Activation screen. Enter your:
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li><strong>License Key</strong> - Format: OSDS-XXXX-XXXX-XXXX-XXXX</li>
          <li><strong>Email Address</strong> - The email associated with your license</li>
        </ul>
        Click "Activate License" to complete the activation.`
    },
    {
      question: 'What happens if my license expires?',
      answer: `OSDSarvaya licenses are perpetual - they don't expire. You can use the license for all future upgrades. If there's an issue with your license, contact support.`
    },
    {
      question: 'Can I transfer my license to another computer?',
      answer: `Yes, contact our support team to request a license transfer. You'll need to provide your current license key and the new machine details.`
    },
    {
      question: 'How is my machine ID generated?',
      answer: `The machine ID is automatically generated from your computer's hardware identifiers (such as machine-id on Linux or UUID on Windows). This ensures each installation has a unique identifier tied to the physical machine.`
    },
    {
      question: 'What if I need to change my hardware?',
      answer: `If you change significant hardware components, your machine ID may change. In such cases, contact support for assistance with license transfer to the new machine.`
    },
    {
      question: 'How do I create an admin account for the first time?',
      answer: `On first launch of the application, you'll see a Setup Wizard. Enter a username (min 3 characters) and a password that meets these requirements:
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li>At least 8 characters long</li>
          <li>At least 1 uppercase letter (A-Z)</li>
          <li>At least 1 numeric digit (0-9)</li>
        </ul>
        Click "Create Admin Account" to complete setup.`
    },
    {
      question: 'What are the password requirements?',
      answer: `Passwords must meet all of these requirements:
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li>Minimum 8 characters</li>
          <li>At least 1 uppercase letter (A-Z)</li>
          <li>At least 1 numeric digit (0-9)</li>
        </ul>
        Example: <code>Admin123</code> or <code>MyPass456</code>`
    },
    {
      question: 'I forgot my password. How do I recover it?',
      answer: `Unfortunately, there is no password recovery option. You will need to:
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li>Delete the database file</li>
          <li>Reinstall the application</li>
          <li>Create a new admin account</li>
        </ul>
        <p class="mt-2">To delete database:</p>
        <ul class="list-disc list-inside mt-1 space-y-1">
          <li>Windows: Delete <code>%APPDATA%/OSDSarvaya/data/</code> folder</li>
          <li>Docker: Delete the volume or database file</li>
        </ul>`
    },
    {
      question: 'Why is my WhatsApp not connecting?',
      answer: `Make sure:
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li>Your phone has an active internet connection</li>
          <li>WhatsApp is logged in on your mobile device</li>
          <li>You scanned the QR code correctly</li>
          <li>Try disconnecting and reconnecting from Settings</li>
        </ul>`
    },
    {
      question: 'Messages are not being sent. What should I do?',
      answer: `Check the following:
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li>Ensure WhatsApp is connected (check Settings page)</li>
          <li>Verify contacts have valid phone numbers</li>
          <li>Check if you've reached WhatsApp's rate limits</li>
          <li>Look at the campaign report for error details</li>
          <li>Try reducing messages per hour in Settings</li>
        </ul>`
    },
    {
      question: 'How do I import contacts from Excel or CSV?',
      answer: `Go to Contacts page and click the Import button. Select your Excel (.xlsx) or CSV file. Map the columns to the appropriate fields (name, phone, email, tags) and click Import.`
    },
    {
      question: 'Can I send images and documents?',
      answer: `Yes! When creating a campaign, use the attachment option to add images or documents. Supported formats include JPG, PNG, PDF, and more.`
    },
    {
      question: 'What happens if I close the app while a campaign is running?',
      answer: `The campaign will stop. For best results, keep the application running until the campaign completes. You can monitor progress from the Dashboard.`
    },
    {
      question: 'How do I backup my data?',
      answer: `Go to Settings > Backup & Restore section. Click "Export Data" to download a JSON file containing all your contacts, groups, campaigns, and settings. Store this file securely.`
    },
    {
      question: 'Will my WhatsApp session persist after closing the app?',
      answer: `Yes, your WhatsApp connection is saved. You won't need to scan the QR code again unless you explicitly disconnect from the Settings page.`
    },
    {
      question: 'How do I connect a different WhatsApp number?',
      answer: `Go to Settings > WhatsApp section. Click "Disconnect" to log out from the current number, then click "Connect" to scan a new QR code with the desired WhatsApp number. Your contacts, groups, and license will be preserved.`
    },
    {
      question: 'How can I change my admin password?',
      answer: `Go to Settings > Change Password section. Enter your current password, then enter and confirm your new password. Click Change Password to save.`
    },
    {
      question: 'What is the recommended messages per hour setting?',
      answer: `We recommend starting with <strong>30 messages per hour</strong> to avoid WhatsApp restrictions. You can adjust this in Settings > Rate Limiting.
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li>Start with 30 msgs/hr for new accounts</li>
          <li>After a few successful campaigns, you can gradually increase</li>
          <li>Stay below 40-50 msgs/hr to minimize ban risk</li>
          <li>If you get restricted, reduce to 15-20 msgs/hr</li>
        </ul>`
    },
    {
      question: 'Why did WhatsApp restrict my account?',
      answer: `WhatsApp may restrict accounts for sending:
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li>Too many messages in a short time</li>
          <li>Bulk or automated messages to unknown contacts</li>
          <li>Messages to people who haven't saved your number</li>
          <li>Many people blocking or reporting your number</li>
        </ul>
        <p class="mt-2">Restrictions typically last 24-48 hours. During this time, avoid using the app heavily.</p>`
    },
    {
      question: 'How do I avoid WhatsApp account restrictions?',
      answer: `Follow these best practices:
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li><strong>Use lower sending rates</strong> - Start with 30 msgs/hr, stay below 40-50</li>
          <li><strong>Add random delays</strong> - The app adds jitter between messages to appear more human</li>
          <li><strong>Warm up gradually</strong> - Start with small campaigns (10-20 messages), then increase</li>
          <li><strong>Send to opted-in contacts</strong> - Only message people who expect to hear from you</li>
          <li><strong>Space out campaigns</strong> - Wait a few hours between large campaigns</li>
          <li><strong>Don't send to unknown numbers</strong> - Only message contacts in your phone</li>
        </ul>`
    },
    {
      question: 'My WhatsApp got restricted. What should I do?',
      answer: `If WhatsApp restricts your account:
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li><strong>Wait it out</strong> - Restrictions usually last 24-48 hours</li>
          <li><strong>Don't try to send more</strong> - This will extend the ban</li>
          <li><strong>Reduce message rate</strong> - Lower your msgs/hr setting to 15-20</li>
          <li><strong>Message slowly when restored</strong> - Start with fewer messages per hour</li>
          <li><strong>Consider WhatsApp Business API</strong> - For legitimate bulk messaging needs</li>
        </ul>`
    },
    {
      question: 'Why do some messages show as failed?',
      answer: `Failed messages can occur due to:
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li>Invalid or inactive phone numbers</li>
          <li>Recipients who have blocked you</li>
          <li>WhatsApp rate limiting</li>
          <li>Network issues</li>
        </ul>
        Check the campaign report for specific error details.`
    },
    {
      question: 'How do I organize contacts into groups?',
      answer: `Go to Groups page and create a new group. Give it a name, then select the contacts you want to add. You can add or remove contacts from groups at any time.`
    },
    {
      question: 'Can I edit a campaign after creating it?',
      answer: `Yes, go to Campaigns page, find your template, and click the edit icon. You can modify the message content and attachments. Note that already sent campaigns cannot be edited.`
    },
    {
      question: 'Where is my data stored?',
      answer: `Your data is stored locally in the application data folder:
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li>Windows: %APPDATA%/OSDSarvaya/data/</li>
          <li>This includes your database, settings, and WhatsApp session</li>
        </ul>`
    },
    {
      question: 'How do I stop a running campaign?',
      answer: `Go to the Dashboard and click the "Stop Campaign" button. The campaign will stop sending new messages, but already sent messages will not be retracted.`
    },
    {
      question: 'What are API Keys and how do I use them?',
      answer: `API Keys let external applications (ERPs, CRMs, scripts) authenticate with OSDSarvaya to send messages programmatically. Create one in <strong>Settings → API Keys</strong>, then include it in the <code>x-api-key</code> HTTP header when calling the Notification API. Each key starts with the prefix <code>osds_</code>. You can disable or revoke keys at any time.`
    },
    {
      question: 'Can I see my API key after creating it?',
      answer: `No. The full API key is shown only once at creation time for security. Make sure to copy it immediately. If you lose it, revoke the old key and create a new one.`
    },
    {
      question: 'What is the Notification API?',
      answer: `The Notification API allows external systems to send WhatsApp messages through OSDSarvaya using API keys. It includes:
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li><strong>POST /api/notify/send</strong> — Send a message to one or more numbers</li>
          <li><strong>POST /api/notify/template</strong> — Send using a pre-defined template</li>
          <li><strong>POST /api/notify/bulk</strong> — Send to all contacts in a group</li>
          <li><strong>GET /api/notify/status/:externalId</strong> — Check delivery status</li>
          <li><strong>GET /api/notify/logs</strong> — View notification history</li>
        </ul>
        <p class="mt-2">See the <strong>Help</strong> page for detailed API documentation with examples.</p>`
    },
    {
      question: 'How do I use message variables in API requests?',
      answer: `Use double curly braces in your message text and provide values in the <code>variables</code> object:
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li><code>{{name}}</code> — Contact's name</li>
          <li><code>{{phone}}</code> — Contact's phone number</li>
          <li><code>{{email}}</code> — Contact's email</li>
          <li>Custom: <code>{{order_id}}</code>, <code>{{amount}}</code>, etc.</li>
        </ul>
        <p class="mt-2">Example: Message = "Hello <code>{{name}}</code>, order <code>{{order_id}}</code> is ready!" with variables: <code>{"name": "John", "order_id": "SO-123"}</code></p>`
    },
    {
      question: 'What are webhooks and why should I use them?',
      answer: `Webhooks let OSDSarvaya push real-time event data to your external systems (ERP, CRM, etc.) when things happen — like a message being sent, a campaign completing, or a message failing. This is useful for keeping your ERP in sync with WhatsApp delivery status without polling.`
    },
    {
      question: 'What events can I subscribe to with webhooks?',
      answer: `You can subscribe to these events:
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li><code>message.sent</code> — A message was successfully sent</li>
          <li><code>message.failed</code> — A message failed to send</li>
          <li><code>campaign.started</code> — A campaign started sending</li>
          <li><code>campaign.completed</code> — A campaign finished all messages</li>
          <li><code>campaign.stopped</code> — A campaign was manually stopped</li>
        </ul>`
    },
    {
      question: 'How do I verify that a webhook is from OSDSarvaya?',
      answer: `Each webhook delivery includes an <code>X-OSDSarvaya-Signature</code> header containing an HMAC-SHA256 hash. Compute HMAC-SHA256 of the raw request body using your webhook secret, and compare it with the signature header. If they match, the webhook is authentic.`
    },
    {
      question: 'What happens if my webhook endpoint is down?',
      answer: `OSDSarvaya retries failed webhook deliveries up to <strong>3 times</strong> with increasing delays: 1 second, 5 seconds, and 25 seconds. If all retries fail, the delivery is logged as failed. You can test your webhook endpoint using the <strong>Test</strong> button in Settings → Webhooks.`
    },
    {
      question: 'Can I use the API when a campaign is already running?',
      answer: `Yes, with some differences:
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li><strong>/api/notify/send</strong> and <strong>/api/notify/template</strong> return HTTP 202 (try again later) while a campaign is running</li>
          <li><strong>/api/notify/bulk</strong> automatically queues your request and sends it after the current campaign finishes</li>
        </ul>`
    },
    {
      question: 'How do I track which ERP order a notification belongs to?',
      answer: `Use the <code>externalId</code> parameter when sending notifications. This can be any string (e.g., your Sales Order number). You can later look up the status using <code>GET /api/notify/status/:externalId</code>. Webhook payloads also include the <code>externalId</code> so your ERP can match events back to the original record.`
    },
    {
      question: 'Is the Notification API different from the Dashboard login?',
      answer: `Yes. The Dashboard uses <strong>JWT authentication</strong> (username + password login). The Notification API uses <strong>API Key authentication</strong> via the <code>x-api-key</code> header. API keys are meant for server-to-server communication and don't require a browser login session.`
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">Frequently Asked Questions</h1>
      <p className="text-gray-400 mb-8">Find answers to common questions about OSDSarvaya</p>

      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <Card key={index} className="overflow-hidden">
            <button
              onClick={() => toggleFAQ(index)}
              className="w-full flex items-center justify-between p-4 text-left focus:outline-none"
            >
              <span className="font-medium text-white pr-4">{faq.question}</span>
              {openIndex === index ? (
                <ChevronUpIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
              )}
            </button>
            {openIndex === index && (
              <div className="px-4 pb-4 text-gray-300">
                <div dangerouslySetInnerHTML={{ __html: faq.answer }} />
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-900/30 rounded-lg border border-blue-800">
        <h3 className="text-white font-semibold mb-2">Still have questions?</h3>
        <p className="text-gray-300">
          Contact us at <a href="mailto:support@osduotech.com" className="text-blue-400 hover:underline">support@osduotech.com</a>
        </p>
      </div>
    </div>
  );
};

export default FAQ;
