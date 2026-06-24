import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getEmergencyContacts, addEmergencyContact, deleteEmergencyContact } from '../api/profile';
import InputField from '../components/InputField';
import Button from '../components/Button';
import Card from '../components/Card';
import Badge from '../components/Badge';
import ErrorBanner from '../components/ErrorBanner';
import NavigationBar from '../components/NavigationBar';

export default function SafetyCenterScreen() {
  const navigate = useNavigate();

  // Core States
  const [currentUser, setCurrentUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [toastMsg, setToastMsg] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null); // index of editing contact

  // Form Fields
  const [nameVal, setNameVal] = useState('');
  const [phoneVal, setPhoneVal] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Dev Toolbar States
  const [toastText, setToastText] = useState('');

  // Mock past safety logs
  const [safetyEvents, setSafetyEvents] = useState([
    {
      id: 1,
      title: "🚨 SOS Alert Dispatched",
      details: "SOS was triggered during ride #102. Cancelled by user within grace window.",
      timestamp: "Yesterday, 6:45 PM",
      status: "cancelled"
    },
    {
      id: 2,
      title: "🚨 SOS Alert Dispatched",
      details: "SOS was triggered during ride #89. Verified safe by campus dispatch response.",
      timestamp: "2 weeks ago, 11:20 AM",
      status: "resolved"
    }
  ]);

  const loadContacts = async () => {
    try {
      const res = await getEmergencyContacts();
      const list = res.data || res || [];
      setContacts(list);
    } catch (err) {
      console.error("Failed to load emergency contacts:", err);
      triggerToast('Failed to load emergency contacts.');
    }
  };

  useEffect(() => {
    loadContacts();
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user session", e);
      }
    }
  }, []);

  const triggerToast = (msg) => {
    setToastText(msg);
    setTimeout(() => setToastText(''), 3000);
  };

  const validateForm = () => {
    let isValid = true;
    setNameError('');
    setPhoneError('');

    if (!nameVal.trim() || nameVal.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      isValid = false;
    }
    if (!phoneVal || !/^\d{10}$/.test(phoneVal)) {
      setPhoneError('Please enter a valid 10-digit phone number');
      isValid = false;
    }
    return isValid;
  };

  const saveContactsToDb = (updatedList) => {
    // Deprecated in real API mode, but retained for dev empty/load button simulations
    setContacts(updatedList);
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await addEmergencyContact({
        contact_name: nameVal.trim(),
        contact_phone: phoneVal.trim()
      });
      await loadContacts();
      setNameVal('');
      setPhoneVal('');
      setShowAddForm(false);
      triggerToast('Contact added successfully.');
    } catch (err) {
      console.error(err);
      triggerToast(err.response?.data?.message || 'Failed to add emergency contact.');
    }
  };

  const handleStartEdit = (index) => {
    setEditingId(index);
    const contact = contacts[index];
    setNameVal(contact.contact_name || contact.name || '');
    setPhoneVal(contact.contact_phone || contact.phone || '');
    setNameError('');
    setPhoneError('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const contactToEdit = contacts[editingId];
    if (!contactToEdit) return;

    try {
      if (contactToEdit.contact_id) {
        await deleteEmergencyContact(contactToEdit.contact_id);
      }
      await addEmergencyContact({
        contact_name: nameVal.trim(),
        contact_phone: phoneVal.trim()
      });
      await loadContacts();
      setEditingId(null);
      setNameVal('');
      setPhoneVal('');
      triggerToast('Contact updated successfully.');
    } catch (err) {
      console.error(err);
      triggerToast(err.response?.data?.message || 'Failed to update contact.');
    }
  };

  const handleDeleteContact = async (index) => {
    if (contacts.length <= 1) {
      alert('⚠️ Mandatory Safety Rule: You must keep at least one emergency contact to participate in commutes.');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this emergency contact?')) {
      const contactToDelete = contacts[index];
      try {
        if (contactToDelete.contact_id) {
          await deleteEmergencyContact(contactToDelete.contact_id);
        }
        await loadContacts();
        triggerToast('Contact deleted.');
      } catch (err) {
        console.error(err);
        triggerToast('Failed to delete contact.');
      }
    }
  };

  const handleClearEvents = () => {
    setSafetyEvents([]);
    triggerToast('Safety event logs cleared.');
  };

  const isContactsEmpty = contacts.length === 0;

  return (
    <div className="min-h-screen bg-brand-bg-base text-brand-text-primary font-sans flex flex-col pb-24 md:pb-6">
      
      {/* Dev Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap gap-2 items-center justify-between text-xs font-semibold">
        <span className="font-bold text-indigo-400">🔧 DEV TOOLBAR:</span>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              saveContactsToDb([]);
              triggerToast('Cleared all contacts for testing empty state.');
            }} 
            className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-650 text-slate-200 transition cursor-pointer"
          >
            Clear Contacts (Test Empty)
          </button>
          <button 
            onClick={() => {
              saveContactsToDb([{ name: "Parent / Guardian", phone: "9876543210" }]);
              triggerToast('Pre-loaded default emergency contact.');
            }} 
            className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-650 text-slate-200 transition cursor-pointer"
          >
            Load Default Contact
          </button>
        </div>
      </div>

      <NavigationBar className="relative z-10" />

      {toastText && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 border border-indigo-500/30 text-indigo-300 px-4 py-2.5 rounded-xl shadow-2xl text-xs md:text-sm font-semibold animate-bounce">
          {toastText}
        </div>
      )}

      {/* Screen Header */}
      <div className="bg-slate-900/60 border-b border-slate-850 px-4 py-3.5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate(-1)} 
              className="text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1 cursor-pointer transition"
            >
              <span>🡐</span> Back
            </button>
            <span className="text-slate-600">|</span>
            <h2 className="text-sm font-bold text-slate-200">Safety & SOS Center</h2>
          </div>
          <Badge variant="danger">Shield Active</Badge>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-lg mx-auto w-full px-4 pt-6 flex-1 space-y-6 text-left">
        
        {/* 1. MANDATORY BLOCKING EMPTY STATE */}
        {isContactsEmpty ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">⚠️</span>
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm text-rose-400 uppercase tracking-wider">Setup Required: Emergency Contact</h4>
                <p className="text-xs text-brand-text-secondary leading-relaxed">
                  You currently have no emergency contacts configured. Safety policy requires at least one verified contact before matching commutes.
                </p>
              </div>
            </div>

            <div className="border-t border-red-500/20 pt-4">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">Add Emergency Contact</h5>
              <form onSubmit={handleAddContact} className="space-y-3">
                <InputField 
                  label="Contact Name"
                  placeholder="e.g. Mom / Guardian Name"
                  value={nameVal}
                  onChange={(e) => setNameVal(e.target.value)}
                  error={nameError}
                />
                <InputField 
                  label="Mobile Number"
                  placeholder="10-digit phone number"
                  value={phoneVal}
                  onChange={(e) => setPhoneVal(e.target.value)}
                  error={phoneError}
                />
                <Button type="submit" className="w-full bg-brand-safety hover:bg-brand-safety-hover">
                  Add Contact & Unlock Commutes
                </Button>
              </form>
            </div>
          </div>
        ) : (
          /* DEFAULT FULLY POPULATED STATE */
          <div className="space-y-6">
            
            {/* Contacts Management Card */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Emergency Contacts</h3>
                {!showAddForm && editingId === null && (
                  <button 
                    onClick={() => { setShowAddForm(true); setNameVal(''); setPhoneVal(''); }}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    + Add New
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {contacts.map((contact, index) => (
                  <Card key={index} className="p-4 border-slate-800">
                    {editingId === index ? (
                      /* Inline Edit Form */
                      <form onSubmit={handleSaveEdit} className="space-y-3 text-left">
                        <h4 className="text-xs font-bold text-slate-300 uppercase">Edit Contact</h4>
                        <InputField 
                          label="Name"
                          value={nameVal}
                          onChange={(e) => setNameVal(e.target.value)}
                          error={nameError}
                        />
                        <InputField 
                          label="Mobile Phone"
                          value={phoneVal}
                          onChange={(e) => setPhoneVal(e.target.value)}
                          error={phoneError}
                        />
                        <div className="flex gap-2 pt-1">
                          <Button type="submit" className="flex-1 py-2 text-xs">Save</Button>
                          <Button 
                            onClick={() => setEditingId(null)} 
                            variant="secondary" 
                            className="px-4 py-2 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      /* Read View */
                      <div className="flex justify-between items-center">
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-sm text-slate-200">{contact.contact_name || contact.name}</h4>
                          <p className="text-xs text-brand-text-secondary font-mono">{contact.contact_phone || contact.phone}</p>
                        </div>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => handleStartEdit(index)}
                            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteContact(index)}
                            className="text-xs font-bold text-rose-400 hover:text-rose-300 cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              {/* Inline Add Form */}
              {showAddForm && (
                <Card className="p-4 border-indigo-500/25 bg-slate-900/40">
                  <form onSubmit={handleAddContact} className="space-y-3">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase">New Contact Details</h4>
                    <InputField 
                      label="Contact Name"
                      placeholder="e.g. Hostel Mate / Campus Security"
                      value={nameVal}
                      onChange={(e) => setNameVal(e.target.value)}
                      error={nameError}
                    />
                    <InputField 
                      label="Phone Number"
                      placeholder="e.g. 9900112233"
                      value={phoneVal}
                      onChange={(e) => setPhoneVal(e.target.value)}
                      error={phoneError}
                    />
                    <div className="flex gap-2 pt-1">
                      <Button type="submit" className="flex-1 py-2 text-xs">Add Contact</Button>
                      <Button 
                        onClick={() => setShowAddForm(false)} 
                        variant="secondary" 
                        className="px-4 py-2 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Card>
              )}
            </div>

            {/* 2. SOS EXPLAINER GUIDE */}
            <div className="space-y-2 text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">How Emergency SOS Works</h3>
              <Card className="p-4 space-y-3.5 text-xs bg-slate-900/40 border-slate-800">
                <div className="flex gap-3">
                  <span className="text-base text-indigo-400 font-bold">1</span>
                  <p className="text-brand-text-secondary leading-relaxed">
                    **One-Tap Trigger**: Click the Floating SOS widget on the active ride screen. It confirms and triggers an alert.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="text-base text-indigo-400 font-bold">2</span>
                  <p className="text-brand-text-secondary leading-relaxed">
                    **Grace Window**: You get a 10-second buffer to cancel the alert if clicked accidentally.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="text-base text-indigo-400 font-bold">3</span>
                  <p className="text-brand-text-secondary leading-relaxed">
                    **Contact & Campus Dispatch**: When locked, an SMS with your active ride ID, vehicle plate, and live GPS is dispatched to your contacts and campus safety desk.
                  </p>
                </div>
              </Card>
            </div>

            {/* 3. SAFETY EVENTS LOG */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Safety History Logs</h3>
                {safetyEvents.length > 0 && (
                  <button 
                    onClick={handleClearEvents}
                    className="text-[10px] uppercase font-bold text-slate-500 hover:text-slate-400 cursor-pointer"
                  >
                    Clear Logs
                  </button>
                )}
              </div>

              {safetyEvents.length === 0 ? (
                <div className="p-5 border border-dashed border-slate-800 rounded-2xl text-center text-xs text-brand-text-muted">
                  No emergency event logs recorded.
                </div>
              ) : (
                <div className="space-y-2">
                  {safetyEvents.map((evt) => (
                    <Card key={evt.id} className="p-3.5 hover:border-slate-800 transition duration-150">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-rose-400">{evt.title}</span>
                        <span className="font-mono text-[10px] text-slate-500">{evt.timestamp}</span>
                      </div>
                      <p className="text-xs text-brand-text-secondary leading-relaxed mt-1">{evt.details}</p>
                      <div className="mt-2.5 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-500"></span>
                        <span className="text-[9px] uppercase font-bold tracking-wider text-brand-text-muted">
                          Status: {evt.status}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* 4. SAFETY TIPS & REPORT CENTER LINK */}
            <div className="space-y-2 text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Safety Guidelines</h3>
              <Card className="p-4 space-y-3.5 text-xs border-slate-800 bg-slate-900/10">
                <div className="flex items-start gap-2">
                  <span className="text-indigo-400">🛡️</span>
                  <span>**Verify the plates**: Match the driver's vehicle registration plate and photo avatar before boarding.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-indigo-400">🛡️</span>
                  <span>**Share live location**: Keep location sharing enabled so your route is monitored during night travels.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-indigo-400">🛡️</span>
                  <span>**Report misconduct**: Have concerns about unsafe driving? Open a ticket in the <Link to="/report-center" className="text-indigo-400 hover:underline font-bold">Report Center</Link> instantly.</span>
                </div>
              </Card>
            </div>

          </div>
        )}

      </main>

      <NavigationBar className="block md:hidden" />
    </div>
  );
}
