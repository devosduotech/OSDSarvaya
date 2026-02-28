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
      question: 'How can I change my admin password?',
      answer: `Go to Settings > Change Password section. Enter your current password, then enter and confirm your new password. Click Change Password to save.`
    },
    {
      question: 'What is the recommended messages per hour setting?',
      answer: `We recommend starting with 50-65 messages per hour. You can increase this gradually based on your needs. Setting it too high may result in WhatsApp temporarily blocking your account.`
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
