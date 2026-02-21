import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Group } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { PlusIcon, TrashIcon, EditIcon, SearchIcon } from '../components/icons/Icons';

const Groups: React.FC = () => {

  const { groups, contacts, addGroup, updateGroup, deleteGroup } = useAppContext();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [currentGroup, setCurrentGroup] = useState<{ name: string; contactIds: string[] }>({
    name: '',
    contactIds: []
  });
  const [contactSearch, setContactSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Get unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    contacts.forEach(c => {
      if (c.tags) {
        c.tags.split(',').forEach(t => {
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
      const matchesSearch = !contactSearch || 
        contact.name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
        contact.phone?.includes(contactSearch);
      
      const matchesTag = !selectedTag || 
        contact.tags?.split(',').map(t => t.trim()).includes(selectedTag);
      
      return matchesSearch && matchesTag;
    });
  }, [contacts, contactSearch, selectedTag]);

  useEffect(() => {
    if (editingGroup) {
      setCurrentGroup({
        name: editingGroup.name,
        contactIds: editingGroup.contactIds
      });
    }
  }, [editingGroup]);

  const openAddModal = () => {
    setEditingGroup(null);
    setCurrentGroup({ name: '', contactIds: [] });
    setIsModalOpen(true);
  };

  const openEditModal = (group: Group) => {
    setEditingGroup(group);
    setIsModalOpen(true);
  };

  const handleSaveGroup = async () => {
    if (!currentGroup.name.trim()) return alert("Group name required");

    setIsSaving(true);
    if (editingGroup) {
      await updateGroup({ ...editingGroup, ...currentGroup });
    } else {
      await addGroup(currentGroup);
    }

    setIsSaving(false);
    setIsModalOpen(false);
  };

  const handleDeleteGroup = async (id: string) => {
    if (window.confirm('Delete this group?')) {
      await deleteGroup(id);
    }
  };

  const handleContactSelection = (contactId: string) => {
    setCurrentGroup(prev => ({
      ...prev,
      contactIds: prev.contactIds.includes(contactId)
        ? prev.contactIds.filter(id => id !== contactId)
        : [...prev.contactIds, contactId]
    }));
  };

  const getContactNames = (ids: string[]) => {
    return contacts
      .filter(c => ids.includes(c.id))
      .slice(0, 3)
      .map(c => c.name);
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <Card>
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold dark:text-white">Groups</h2>

          <Button onClick={openAddModal}>
            <div className="flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              Create Group
            </div>
          </Button>
        </div>
      </Card>

      {/* EMPTY STATE */}
      {groups.length === 0 && (
        <Card>
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            No groups created yet. Create a group to organize contacts.
          </div>
        </Card>
      )}

      {/* GROUP GRID */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map(group => {
          const previewNames = getContactNames(group.contactIds);

          return (
            <Card key={group.id} className="flex flex-col justify-between hover:shadow-md transition">

              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                  {group.name}
                </h3>

                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {group.contactIds.length} members
                </p>

                {previewNames.length > 0 && (
                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    {previewNames.join(', ')}
                    {group.contactIds.length > 3 && ' + more'}
                  </div>
                )}
              </div>

              {/* ACTIONS */}
              <div className="mt-5 pt-4 border-t flex justify-end gap-2">

                <Button
                  variant="secondary"
                  onClick={() => openEditModal(group)}
                >
                  <div className="flex items-center gap-1">
                    <EditIcon className="w-4 h-4" />
                    Edit
                  </div>
                </Button>

                <Button
                  variant="danger"
                  onClick={() => handleDeleteGroup(group.id)}
                >
                  <div className="flex items-center gap-1">
                    <TrashIcon className="w-4 h-4" />
                    Delete
                  </div>
                </Button>

              </div>

            </Card>
          );
        })}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">

          <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-xl p-6 space-y-5 shadow-xl">

            <h2 className="text-xl font-semibold">
              {editingGroup ? 'Edit Group' : 'Create Group'}
            </h2>

              {/* NAME */}
            <div>
              <label className="text-sm font-medium dark:text-gray-200">Group Name</label>
              <input
                type="text"
                className="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                value={currentGroup.name}
                onChange={(e) =>
                  setCurrentGroup({ ...currentGroup, name: e.target.value })
                }
              />
            </div>

            {/* CONTACT SELECT */}
            <div>
              <label className="text-sm font-medium dark:text-gray-200">Select Contacts</label>

              {/* SEARCH AND FILTER */}
              <div className="mt-2 flex gap-2">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  />
                </div>
                
                {allTags.length > 0 && (
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="px-2 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  >
                    <option value="">All Tags</option>
                    {allTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                )}
              </div>

                {(contactSearch || selectedTag) && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Showing {filteredContacts.length} of {contacts.length} contacts
                  </p>
                )}

                {/* SELECT ALL */}
                {filteredContacts.length > 0 && (
                  <div className="flex items-center p-3 border-b bg-blue-50 dark:bg-slate-700">
                    <input
                      type="checkbox"
                      checked={filteredContacts.length > 0 && filteredContacts.every(c => currentGroup.contactIds.includes(c.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          // Add all filtered contacts that aren't already selected
                          const newIds = [...new Set([...currentGroup.contactIds, ...filteredContacts.map(c => c.id)])];
                          setCurrentGroup({ ...currentGroup, contactIds: newIds });
                        } else {
                          // Remove all filtered contacts
                          const filteredIds = filteredContacts.map(c => c.id);
                          setCurrentGroup({ 
                            ...currentGroup, 
                            contactIds: currentGroup.contactIds.filter(id => !filteredIds.includes(id)) 
                          });
                        }
                      }}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="ml-3 text-sm font-medium text-blue-700">
                      Select All Visible ({filteredContacts.length})
                    </span>
                  </div>
                )}

                <div className="border rounded-lg max-h-64 overflow-y-auto dark:border-slate-600">

                {filteredContacts.length === 0 && (
                  <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
                    No contacts found
                  </div>
                )}

                {filteredContacts.map(contact => (
                  <div
                    key={contact.id}
                    className="flex items-center p-3 border-b last:border-none hover:bg-gray-50 dark:hover:bg-slate-700 dark:border-slate-600"
                  >
                    <input
                      type="checkbox"
                      checked={currentGroup.contactIds.includes(contact.id)}
                      onChange={() => handleContactSelection(contact.id)}
                      className="h-4 w-4 text-blue-600"
                    />

                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{contact.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{contact.phone}</p>
                    </div>
                  </div>
                ))}

              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex justify-end gap-3">

              <Button
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>

              <Button onClick={handleSaveGroup} loading={isSaving}>
                {editingGroup ? 'Update Group' : 'Save Group'}
              </Button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default Groups;
