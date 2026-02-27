import React from 'react';
import Card from '../components/ui/Card';

const Help: React.FC = () => {

  const sections = [
    {
      title: 'Getting Started',
      content: `
        <p class="mb-4">Welcome to OSDSarvaya! This guide will help you get started with using the application.</p>
        <ol class="list-decimal list-inside space-y-2 ml-2">
          <li>Log in using your admin credentials</li>
          <li>Go to <strong>Settings</strong> and scan the WhatsApp QR code to connect</li>
          <li>Add contacts manually or import from a file</li>
          <li>Create groups to organize your contacts</li>
          <li>Create a campaign template with your message</li>
          <li>Run the campaign to send bulk messages</li>
        </ol>
      `
    },
    {
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
      `
    },
    {
      title: 'Managing Contacts',
      content: `
        <p class="mb-4">You can add contacts manually or import from a file:</p>
        <h4 class="font-semibold mt-3 mb-2">Add Manually:</h4>
        <ol class="list-decimal list-inside space-y-1 ml-2">
          <li>Go to <strong>Contacts</strong> page</li>
          <li>Click <strong>Add Contact</strong> button</li>
          <li>Fill in name, phone number, email (optional), and tags (optional)</li>
          <li>Click <strong>Save</strong></li>
        </ol>
        <h4 class="font-semibold mt-3 mb-2">Import from CSV/Excel:</h4>
        <ol class="list-decimal list-inside space-y-1 ml-2">
          <li>Go to <strong>Contacts</strong> page</li>
          <li>Click <strong>Import</strong> button</li>
          <li>Select a CSV or Excel file</li>
          <li>Map the columns to contact fields</li>
          <li>Click <strong>Import</strong> to add all contacts</li>
        </ol>
      `
    },
    {
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
        <p class="mt-4">You can edit groups to add or remove contacts at any time.</p>
      `
    },
    {
      title: 'Creating Campaigns',
      content: `
        <p class="mb-4">Campaigns let you send bulk messages to your contacts:</p>
        <ol class="list-decimal list-inside space-y-2 ml-2">
          <li>Go to <strong>Campaigns</strong> page</li>
          <li>Click <strong>New Campaign</strong></li>
          <li>Enter a campaign name</li>
          <li>Compose your message in the message box</li>
          <li>Optionally attach images or documents</li>
          <li>Click <strong>Save Template</strong></li>
        </ol>
        <h4 class="font-semibold mt-4 mb-2">Running a Campaign:</h4>
        <ol class="list-decimal list-inside space-y-1 ml-2">
          <li>Find your saved template in the list</li>
          <li>Click the <strong>Play</strong> button to run</li>
          <li>Select target groups</li>
          <li>Confirm to start sending</li>
        </ol>
      `
    },
    {
      title: 'Backup & Restore',
      content: `
        <p class="mb-4">Keep your data safe by creating regular backups:</p>
        <h4 class="font-semibold mt-3 mb-2">Export Data:</h4>
        <ol class="list-decimal list-inside space-y-1 ml-2">
          <li>Go to <strong>Settings</strong> page</li>
          <li>Find the <strong>Backup & Restore</strong> section</li>
          <li>Click <strong>Export Data</strong></li>
          <li>Save the JSON file to a secure location</li>
        </ol>
        <h4 class="font-semibold mt-3 mb-2">Import Data:</h4>
        <ol class="list-decimal list-inside space-y-1 ml-2">
          <li>Go to <strong>Settings</strong> page</li>
          <li>Find the <strong>Backup & Restore</strong> section</li>
          <li>Click <strong>Import Data</strong></li>
          <li>Select your backup JSON file</li>
          <li>Confirm to restore - this will overwrite existing data</li>
        </ol>
      `
    },
    {
      title: 'Message Settings',
      content: `
        <p class="mb-4">Configure how messages are sent:</p>
        <ul class="list-disc list-inside space-y-2 ml-2">
          <li><strong>Messages per hour</strong>: Control the sending speed (default: 65)</li>
          <li><strong>Delay between messages</strong>: Add random delays to avoid detection</li>
          <li><strong>Retry failed messages</strong>: Automatically retry up to 3 times</li>
        </ul>
        <p class="mt-4">Find these settings in the <strong>Settings</strong> page under the Message Settings section.</p>
      `
    },
    {
      title: 'Changing Password',
      content: `
        <p>For security, change your admin password regularly:</p>
        <ol class="list-decimal list-inside space-y-2 ml-2 mt-3">
          <li>Go to <strong>Settings</strong> page</li>
          <li>Find the <strong>Change Password</strong> section</li>
          <li>Enter your current password</li>
          <li>Enter and confirm your new password</li>
          <li>Click <strong>Change Password</strong></li>
        </ol>
      `
    }
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">Help Center</h1>
      <p className="text-gray-400 mb-8">Learn how to use OSDSarvaya effectively</p>

      <div className="space-y-6">
        {sections.map((section, index) => (
          <Card key={index}>
            <h2 className="text-xl font-semibold text-white mb-4">{section.title}</h2>
            <div 
              className="text-gray-300 prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: section.content }}
            />
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Help;
