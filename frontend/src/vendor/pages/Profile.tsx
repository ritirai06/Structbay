import { useState, useEffect, useRef } from 'react';
import { Building, Phone, Mail, MapPin, Save, Edit, Camera, Lock, Bell, CreditCard, CheckCircle, AlertCircle, X } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const SB = { color: 'var(--sb-text-primary)', muted: 'var(--sb-text-muted)', faint: 'var(--sb-text-faint)', orange: 'var(--sb-orange)', card: 'var(--sb-card)', border: 'var(--sb-border)', bg: 'var(--sb-bg-section)' };
const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50';
const inputStyle = { background: 'var(--sb-bg-section)', border: '1px solid var(--sb-border)', color: 'var(--sb-text-primary)' };

type Tab = 'profile' | 'bank' | 'notifications' | 'security';

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: SB.muted }}>
        {label}{required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

export function Profile() {
  const { user, refresh } = useAuth();
  const [tab, setTab] = useState<Tab>('profile');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  // Profile fields
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [officeAddress, setOfficeAddress] = useState({ street: '', area: '', city: '', state: '', pincode: '', landmark: '' });

  // Bank details
  const [bankDetails, setBankDetails] = useState({ accountHolderName: '', accountNumber: '', ifscCode: '', bankName: '', branch: '' });

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState({ email: true, sms: true, whatsapp: false, orderAssigned: true, invoiceRequest: true, dispatchRequest: true, deliveryUpdates: true, announcements: true });

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    api.getProfile().then(r => {
      const p = r.data;
      setProfile(p);
      setName(p.name ?? '');
      setCompanyName(p.companyName ?? '');
      setContactPerson(p.contactPerson ?? '');
      setPhone(p.phone ?? '');
      setGstNumber(p.gstNumber ?? '');
      setPanNumber(p.panNumber ?? '');
      if (p.officeAddress) setOfficeAddress(p.officeAddress);
      if (p.bankDetails) setBankDetails(p.bankDetails);
      if (p.notifications) setNotifPrefs(p.notifications);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await api.updateProfile({ name, companyName, contactPerson, phone, gstNumber, officeAddress });
      await refresh();
      setEditing(false);
      showMsg('success', 'Profile updated successfully!');
    } catch (err: any) { showMsg('error', err.message ?? 'Update failed.'); }
    finally { setSaving(false); }
  }

  async function saveBank() {
    setSaving(true);
    try {
      await api.updateProfile({ bankDetails });
      showMsg('success', 'Bank details updated!');
    } catch (err: any) { showMsg('error', err.message ?? 'Update failed.'); }
    finally { setSaving(false); }
  }

  async function saveNotifications() {
    setSaving(true);
    try {
      await api.updateProfile({ notifications: notifPrefs });
      showMsg('success', 'Notification preferences saved!');
    } catch (err: any) { showMsg('error', err.message ?? 'Update failed.'); }
    finally { setSaving(false); }
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) { showMsg('error', 'Passwords do not match.'); return; }
    if (newPassword.length < 8) { showMsg('error', 'Password must be at least 8 characters.'); return; }
    setSaving(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      showMsg('success', 'Password changed successfully!');
    } catch (err: any) { showMsg('error', err.message ?? 'Password change failed.'); }
    finally { setSaving(false); }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('image', file);
    try {
      await api.uploadProfileImage(form);
      await refresh();
      showMsg('success', 'Profile image updated!');
    } catch (err: any) { showMsg('error', err.message ?? 'Image upload failed.'); }
  }

  const initials = (user?.name ?? user?.companyName ?? 'V').charAt(0).toUpperCase();
  const TABS: { key: Tab; label: string; icon: typeof Edit }[] = [
    { key: 'profile', label: 'Profile', icon: Edit },
    { key: 'bank', label: 'Bank Details', icon: CreditCard },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'security', label: 'Security', icon: Lock },
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: SB.orange, borderTopColor: 'transparent' }} />
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black" style={{ color: SB.color }}>Vendor Profile</h1>
        <p className="text-sm mt-0.5" style={{ color: SB.muted }}>Manage your company information and account settings.</p>
      </div>

      {msg && (
        <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: msg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
          <p className={`text-sm font-medium flex-1 ${msg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>
          <button onClick={() => setMsg(null)}><X className="w-4 h-4" style={{ color: SB.faint }} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Left: Avatar + Status Card */}
        <div className="space-y-4">
          <div className="rounded-2xl p-5 flex flex-col items-center text-center" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
            <div className="relative mb-4">
              {user?.profileImage?.url
                ? <img src={user.profileImage.url} className="w-20 h-20 rounded-2xl object-cover" alt="" />
                : <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-2xl" style={{ background: 'var(--sb-orange)' }}>{initials}</div>
              }
              <button onClick={() => imgRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{ background: 'var(--sb-orange)', color: '#fff' }} title="Change photo">
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>
            <p className="font-black text-base" style={{ color: SB.color }}>{companyName || profile?.companyName || 'Vendor'}</p>
            <p className="text-sm mt-0.5" style={{ color: SB.muted }}>{profile?.email}</p>
            <div className="flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              {profile?.vendorStatus ?? 'Active'}
            </div>
          </div>

          <div className="rounded-2xl p-4 space-y-3" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: SB.muted }}>Account Info</p>
            {[
              ['Role', profile?.role ?? '—'],
              ['Joined', profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'],
              ['Last Login', profile?.lastLogin ? new Date(profile.lastLogin).toLocaleDateString('en-IN') : '—'],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between text-xs">
                <span style={{ color: SB.faint }}>{l}</span>
                <span className="font-semibold" style={{ color: SB.color }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Tabs + Content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Tab bar */}
          <div className="flex flex-wrap gap-2">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={tab === key
                  ? { background: 'var(--sb-orange)', color: '#fff' }
                  : { background: SB.card, color: SB.muted, border: `1px solid ${SB.border}` }}>
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Profile Tab */}
          {tab === 'profile' && (
            <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: SB.muted }}>Company Information</h2>
                {!editing && (
                  <button onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                    style={{ background: 'var(--sb-orange-subtle)', color: SB.orange, border: '1px solid var(--sb-orange-border)' }}>
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Company Name" required>
                    <input value={companyName} onChange={e => setCompanyName(e.target.value)} disabled={!editing}
                      className={inputCls} style={inputStyle} placeholder="ABC Materials Pvt Ltd" />
                  </Field>
                  <Field label="Contact Person" required>
                    <input value={contactPerson} onChange={e => setContactPerson(e.target.value)} disabled={!editing}
                      className={inputCls} style={inputStyle} placeholder="Full name" />
                  </Field>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Phone Number" required>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: SB.faint }} />
                      <input value={phone} onChange={e => setPhone(e.target.value)} disabled={!editing}
                        className={`${inputCls} pl-9`} style={inputStyle} placeholder="+91 XXXXX XXXXX" />
                    </div>
                  </Field>
                  <Field label="Email">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: SB.faint }} />
                      <input value={profile?.email ?? ''} disabled
                        className={`${inputCls} pl-9`} style={{ ...inputStyle, opacity: 0.6 }} />
                    </div>
                  </Field>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="GST Number">
                    <input value={gstNumber} onChange={e => setGstNumber(e.target.value)} disabled={!editing}
                      className={inputCls} style={inputStyle} placeholder="27AAAAA0000A1Z5" />
                  </Field>
                  <Field label="PAN Number">
                    <input value={panNumber} disabled className={inputCls} style={{ ...inputStyle, opacity: 0.6 }} />
                  </Field>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: SB.muted }}>Office Address</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Street">
                      <input value={officeAddress.street} onChange={e => setOfficeAddress(a => ({ ...a, street: e.target.value }))} disabled={!editing}
                        className={inputCls} style={inputStyle} />
                    </Field>
                    <Field label="Area">
                      <input value={officeAddress.area} onChange={e => setOfficeAddress(a => ({ ...a, area: e.target.value }))} disabled={!editing}
                        className={inputCls} style={inputStyle} />
                    </Field>
                    <Field label="City">
                      <input value={officeAddress.city} onChange={e => setOfficeAddress(a => ({ ...a, city: e.target.value }))} disabled={!editing}
                        className={inputCls} style={inputStyle} />
                    </Field>
                    <Field label="State">
                      <input value={officeAddress.state} onChange={e => setOfficeAddress(a => ({ ...a, state: e.target.value }))} disabled={!editing}
                        className={inputCls} style={inputStyle} />
                    </Field>
                    <Field label="Pincode">
                      <input value={officeAddress.pincode} onChange={e => setOfficeAddress(a => ({ ...a, pincode: e.target.value }))} disabled={!editing}
                        className={inputCls} style={inputStyle} />
                    </Field>
                    <Field label="Landmark">
                      <input value={officeAddress.landmark} onChange={e => setOfficeAddress(a => ({ ...a, landmark: e.target.value }))} disabled={!editing}
                        className={inputCls} style={inputStyle} />
                    </Field>
                  </div>
                </div>
                {editing && (
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setEditing(false)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                      style={{ background: SB.bg, color: SB.muted, border: `1px solid ${SB.border}` }}>
                      Cancel
                    </button>
                    <button onClick={saveProfile} disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
                      style={{ background: 'var(--sb-orange)', color: '#0D0D0D' }}>
                      {saving ? <div className="w-4 h-4 rounded-full border-2 border-[#0D0D0D]/30 border-t-[#0D0D0D] animate-spin" /> : <Save className="w-4 h-4" />}
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bank Tab */}
          {tab === 'bank' && (
            <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
              <h2 className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: SB.muted }}>Bank Details</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Account Holder Name">
                    <input value={bankDetails.accountHolderName} onChange={e => setBankDetails(b => ({ ...b, accountHolderName: e.target.value }))}
                      className={inputCls} style={inputStyle} placeholder="As per bank records" />
                  </Field>
                  <Field label="Account Number">
                    <input value={bankDetails.accountNumber} onChange={e => setBankDetails(b => ({ ...b, accountNumber: e.target.value }))}
                      className={inputCls} style={inputStyle} placeholder="Account number" />
                  </Field>
                  <Field label="IFSC Code">
                    <input value={bankDetails.ifscCode} onChange={e => setBankDetails(b => ({ ...b, ifscCode: e.target.value.toUpperCase() }))}
                      className={inputCls} style={inputStyle} placeholder="SBIN0001234" />
                  </Field>
                  <Field label="Bank Name">
                    <input value={bankDetails.bankName} onChange={e => setBankDetails(b => ({ ...b, bankName: e.target.value }))}
                      className={inputCls} style={inputStyle} placeholder="State Bank of India" />
                  </Field>
                  <Field label="Branch">
                    <input value={bankDetails.branch} onChange={e => setBankDetails(b => ({ ...b, branch: e.target.value }))}
                      className={inputCls} style={inputStyle} placeholder="Branch name" />
                  </Field>
                </div>
                <button onClick={saveBank} disabled={saving}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
                  style={{ background: 'var(--sb-orange)', color: '#0D0D0D' }}>
                  {saving ? <div className="w-4 h-4 rounded-full border-2 border-[#0D0D0D]/30 border-t-[#0D0D0D] animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Bank Details'}
                </button>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {tab === 'notifications' && (
            <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
              <h2 className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: SB.muted }}>Notification Preferences</h2>
              <div className="space-y-3">
                {[
                  ['email', 'Email Notifications'],
                  ['sms', 'SMS Alerts'],
                  ['whatsapp', 'WhatsApp (Coming Soon)'],
                  ['orderAssigned', 'New Order Assigned'],
                  ['invoiceRequest', 'Invoice Requests'],
                  ['dispatchRequest', 'Dispatch Requests'],
                  ['deliveryUpdates', 'Delivery Updates'],
                  ['announcements', 'Admin Announcements'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between p-3 rounded-xl cursor-pointer"
                    style={{ background: SB.bg, border: `1px solid ${SB.border}` }}>
                    <span className="text-sm" style={{ color: SB.color }}>{label}</span>
                    <div
                      className="w-10 h-5 rounded-full relative transition-colors cursor-pointer"
                      style={{ background: (notifPrefs as any)[key] ? 'var(--sb-orange)' : SB.border }}
                      onClick={() => setNotifPrefs(p => ({ ...p, [key]: !(p as any)[key] }))}
                    >
                      <div className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
                        style={{ left: (notifPrefs as any)[key] ? '22px' : '2px' }} />
                    </div>
                  </label>
                ))}
              </div>
              <button onClick={saveNotifications} disabled={saving}
                className="mt-5 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
                style={{ background: 'var(--sb-orange)', color: '#0D0D0D' }}>
                {saving ? <div className="w-4 h-4 rounded-full border-2 border-[#0D0D0D]/30 border-t-[#0D0D0D] animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          )}

          {/* Security Tab */}
          {tab === 'security' && (
            <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
              <h2 className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: SB.muted }}>Change Password</h2>
              <div className="space-y-4 max-w-md">
                <Field label="Current Password" required>
                  <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                    className={inputCls} style={inputStyle} placeholder="Enter current password" />
                </Field>
                <Field label="New Password" required>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    className={inputCls} style={inputStyle} placeholder="Minimum 8 characters" />
                </Field>
                <Field label="Confirm New Password" required>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    className={inputCls} style={inputStyle} placeholder="Repeat new password" />
                </Field>
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Passwords do not match
                  </p>
                )}
                <button onClick={changePassword} disabled={saving || !currentPassword || !newPassword || !confirmPassword}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
                  style={{ background: 'var(--sb-orange)', color: '#0D0D0D' }}>
                  {saving ? <div className="w-4 h-4 rounded-full border-2 border-[#0D0D0D]/30 border-t-[#0D0D0D] animate-spin" /> : <Lock className="w-4 h-4" />}
                  {saving ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
