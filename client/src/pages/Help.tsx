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
