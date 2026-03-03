import React, { useRef, useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Contact } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { UploadIcon, TrashIcon, PlusIcon, EditIcon, SearchIcon } from '../components/icons/Icons';

const Contacts: React.FC = () => {
  const { contacts, addContact, updateContact, deleteContact, addContactsBulk, toggleContactOptStatus } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const [currentContact, setCurrentContact] = useState<Partial<Contact>>({
    name: '',
    phone: '',
    email: '',
    tags: ''
  });

  // Get unique tags from all contacts
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    contacts.forEach(c => {
      if (c.tags) {
        c.tags.split(/[;,]/).forEach(t => {
          const trimmed = t.trim();
          if (trimmed) tags.add(trimmed);
        });
      }
    });
    return Array.from(tags).sort();
  }, [contacts]);

  // Filter contacts based on search and tag
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      const matchesSearch = !searchQuery || 
        contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phone?.includes(searchQuery) ||
        contact.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTag = !selectedTag || 
        contact.tags?.split(/[;,]/).map(t => t.trim()).includes(selectedTag);
      
      return matchesSearch && matchesTag;
    });
  }, [contacts, searchQuery, selectedTag]);

  // ================================
  // MODAL HANDLERS
  // ================================
  const openAddModal = () => {
    setEditingContact(null);
    setCurrentContact({ name: '', phone: '', email: '', tags: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setCurrentContact(contact);
    setIsModalOpen(true);
  };

  // ================================
  // CSV IMPORT
  // ================================
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (e) => {
      const text = e.target?.result as string;

      const lines = text.split('\n').filter(line => line.trim() !== '');

      const newContacts: Omit<Contact, 'id'>[] = lines
        .slice(1)
        .map(line => {
          const columns = line.split(',');
          const name = columns[1]?.trim() || '';
          const phone = columns[2]?.trim() || '';
          const email = columns[3]?.trim() || '';
          
          const tagColumns = columns.slice(4).filter(t => t.trim() !== '');
          const tags = tagColumns.map(t => t.trim()).join(';');

          return { name, phone, email, tags };
        })
        .filter(c => c.phone);

      if (newContacts.length === 0) {
        alert('No valid contacts found in CSV');
        return;
      }

      await addContactsBulk(newContacts);
    };

    reader.readAsText(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ================================
  // SAVE CONTACT
  // ================================
  const handleSaveContact = async () => {
    if (!currentContact.name || !currentContact.phone) {
      alert("Name and Phone are required");
      return;
    }

    setIsSaving(true);
    let result;
    if (editingContact) {
      result = await updateContact({ ...editingContact, ...currentContact });
    } else {
      result = await addContact({
        name: currentContact.name,
        phone: currentContact.phone,
        email: currentContact.email || '',
        tags: currentContact.tags || ''
      });
    }

    if (result && !result.success) {
      alert(result.error || 'Failed to save contact');
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    setIsModalOpen(false);
  };

  // ================================
  // DELETE
  // ================================
  const handleDeleteContact = async (id: string) => {
    if (window.confirm('Delete this contact? This will remove it from all groups.')) {
      await deleteContact(id);
    }
  };

  // ================================
  // UI
  // ================================
  return (
    <div className="space-y-6">

      {/* HEADER */}
      <Card>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-xl font-semibold text-slate-800">Contacts</h2>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={openAddModal}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Contact
            </Button>

            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon className="w-4 h-4 mr-2" />
              Import CSV
            </Button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              hidden
            />
          </div>
        </div>

        {/* SEARCH AND FILTER */}
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>
          
          {allTags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          )}
          
          {(searchQuery || selectedTag) && (
            <Button 
              variant="secondary" 
              onClick={() => {
                setSearchQuery('');
                setSelectedTag('');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* FILTER STATS */}
        {(searchQuery || selectedTag) && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredContacts.length} of {contacts.length} contacts
          </p>
        )}
      </Card>

      {/* TABLE */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">

            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tags</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Opt</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
              {filteredContacts.map(contact => (
                <tr key={contact.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition">

                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    {contact.name}
                  </td>

                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                    {contact.phone}
                  </td>

                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                    {contact.email || '-'}
                  </td>

                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                    {contact.tags || '-'}
                  </td>

                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleContactOptStatus(contact.id, contact.optedIn === 0)}
                      className={`px-2 py-1 text-xs rounded-full font-medium ${
                        contact.optedIn !== 0 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                          : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      }`}
                      title={contact.optedIn !== 0 ? 'Click to opt out' : 'Click to opt in'}
                    >
                      {contact.optedIn !== 0 ? 'IN' : 'OUT'}
                    </button>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">

                      <Button
                        variant="secondary"
                        onClick={() => openEditModal(contact)}
                      >
                        <EditIcon className="w-4 h-4 mr-1" />
                        Edit
                      </Button>

                      <Button
                        variant="danger"
                        onClick={() => handleDeleteContact(contact.id)}
                      >
                        <TrashIcon className="w-4 h-4 mr-1" />
                        Delete
                      </Button>

                    </div>
                  </td>

                </tr>
              ))}

              {contacts.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-500 dark:text-gray-400">
                    No contacts found. Add or import contacts.
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      </Card>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

          <div className="bg-white dark:bg-slate-800 w-full max-w-md p-6 rounded-xl space-y-5 shadow-lg">

            <h2 className="text-xl font-semibold dark:text-white">
              {editingContact ? 'Edit Contact' : 'New Contact'}
            </h2>

            {/* NAME */}
            <div>
              <label className="text-sm font-medium dark:text-gray-200">Name</label>
              <input
                className="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                value={currentContact.name || ''}
                onChange={(e) => setCurrentContact({ ...currentContact, name: e.target.value })}
              />
            </div>

            {/* PHONE */}
            <div>
              <label className="text-sm font-medium dark:text-gray-200">Phone Number</label>
              <input
                className="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                value={currentContact.phone || ''}
                onChange={(e) => setCurrentContact({ ...currentContact, phone: e.target.value })}
              />
            </div>

            {/* EMAIL */}
            <div>
              <label className="text-sm font-medium dark:text-gray-200">Email</label>
              <input
                type="email"
                className="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                value={currentContact.email || ''}
                onChange={(e) => setCurrentContact({ ...currentContact, email: e.target.value })}
              />
            </div>

            {/* TAGS */}
            <div>
              <label className="text-sm font-medium dark:text-gray-200">Tags</label>
              <input
                className="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                value={currentContact.tags || ''}
                onChange={(e) => setCurrentContact({ ...currentContact, tags: e.target.value })}
              />
            </div>

            {/* ACTIONS */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>

              <Button onClick={handleSaveContact} loading={isSaving}>
                {editingContact ? 'Update Contact' : 'Save Contact'}
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Contacts;
