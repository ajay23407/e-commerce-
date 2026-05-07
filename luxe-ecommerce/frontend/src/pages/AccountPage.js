import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function AccountPage() {
  const { user, updateUser, logout } = useAuth();
  const [tab, setTab]         = useState('profile');
  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [addresses, setAddresses] = useState([]);
  const [addrForm, setAddrForm] = useState({ name:'', phone:'', line1:'', line2:'', city:'', state:'', pincode:'', country:'India', is_default: false });
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);

  useEffect(() => {
    document.title = 'My Account — LUXE';
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try { const r = await api.get('/addresses'); setAddresses(r.data.addresses); } catch {}
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.put('/auth/profile', profile);
      updateUser(res.data.user);
      toast.success('Profile updated!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update profile.'); }
    finally { setSavingProfile(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirm) { toast.error('New passwords do not match.'); return; }
    if (passwords.newPassword.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    setSavingPwd(true);
    try {
      await api.put('/auth/change-password', { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      toast.success('Password changed!');
      setPasswords({ currentPassword:'', newPassword:'', confirm:'' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to change password.'); }
    finally { setSavingPwd(false); }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    setSavingAddr(true);
    try {
      await api.post('/addresses', addrForm);
      toast.success('Address added!');
      setShowAddrForm(false);
      setAddrForm({ name:'', phone:'', line1:'', line2:'', city:'', state:'', pincode:'', country:'India', is_default: false });
      loadAddresses();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add address.'); }
    finally { setSavingAddr(false); }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    try { await api.delete(`/addresses/${id}`); toast.success('Address deleted.'); loadAddresses(); } catch {}
  };

  const handleSetDefault = async (id) => {
    try { await api.patch(`/addresses/${id}/default`); loadAddresses(); toast.success('Default address updated.'); } catch {}
  };

  const tabs = [
    { id:'profile', label:'Profile' },
    { id:'password', label:'Password' },
    { id:'addresses', label:'Addresses' },
  ];

  const indiaStates = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Puducherry','Chandigarh'];

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-12">
      <div className="mb-8">
        <nav className="flex items-center gap-2 text-xs text-gray-400 mb-4">
          <Link to="/" className="hover:text-luxury-black">Home</Link><span>/</span>
          <span className="text-luxury-black">My Account</span>
        </nav>
        <h1 className="font-serif text-4xl">My Account</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10">
        {/* Sidebar */}
        <div>
          {/* User card */}
          <div className="bg-luxury-black text-white p-6 mb-4">
            <div className="w-14 h-14 rounded-full bg-gold flex items-center justify-center text-luxury-black font-serif text-2xl mb-3">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <p className="font-medium">{user?.name}</p>
            <p className="text-xs text-white/50 mt-0.5">{user?.email}</p>
            {user?.is_verified && <span className="inline-block mt-2 text-[10px] text-gold tracking-wider">✓ Verified Account</span>}
          </div>

          {/* Quick links */}
          <nav className="border border-gray-200">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 last:border-b-0 transition-colors ${tab === t.id ? 'bg-luxury-black text-white font-medium' : 'hover:bg-gray-50 text-gray-700'}`}>
                {t.label}
              </button>
            ))}
            <Link to="/orders" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-200">My Orders →</Link>
            <Link to="/wishlist" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100">Wishlist →</Link>
            <button onClick={logout} className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-gray-200">Sign Out</button>
          </nav>
        </div>

        {/* Content */}
        <div>
          {/* Profile */}
          {tab === 'profile' && (
            <div>
              <h2 className="font-serif text-2xl mb-6">Profile Details</h2>
              <form onSubmit={handleSaveProfile} className="max-w-lg space-y-4">
                <div>
                  <label className="form-label">Full Name</label>
                  <input type="text" className="form-input" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-input bg-gray-50 cursor-not-allowed" value={user?.email} disabled />
                  <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
                </div>
                <div>
                  <label className="form-label">Phone Number</label>
                  <input type="tel" className="form-input" placeholder="+91 98765 43210" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} />
                </div>
                <div className="pt-2">
                  <p className="text-[10px] text-gray-400 tracking-widest uppercase mb-2">Account Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Member since', new Date(user?.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })],
                      ['Account role', user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)],
                      ['Orders placed', user?.order_count || '0'],
                      ['Wishlist items', user?.wishlist_count || '0'],
                    ].map(([l, v]) => (
                      <div key={l} className="bg-gray-50 p-3">
                        <p className="text-[10px] text-gray-400 tracking-wider uppercase mb-1">{l}</p>
                        <p className="text-sm font-medium">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={savingProfile} className="btn btn-primary">
                  {savingProfile ? <><div className="spinner spinner-sm spinner-white" /> Saving...</> : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {/* Password */}
          {tab === 'password' && (
            <div>
              <h2 className="font-serif text-2xl mb-6">Change Password</h2>
              <form onSubmit={handleChangePassword} className="max-w-lg space-y-4">
                <div>
                  <label className="form-label">Current Password</label>
                  <input type="password" className="form-input" placeholder="••••••••"
                    value={passwords.currentPassword} onChange={e => setPasswords({...passwords, currentPassword: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">New Password</label>
                  <input type="password" className="form-input" placeholder="Min. 8 characters"
                    value={passwords.newPassword} onChange={e => setPasswords({...passwords, newPassword: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Confirm New Password</label>
                  <input type="password" className="form-input" placeholder="Re-enter new password"
                    value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} />
                  {passwords.confirm && passwords.newPassword !== passwords.confirm && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
                  )}
                </div>
                <button type="submit" disabled={savingPwd} className="btn btn-primary">
                  {savingPwd ? <><div className="spinner spinner-sm spinner-white" /> Updating...</> : 'Change Password'}
                </button>
              </form>
            </div>
          )}

          {/* Addresses */}
          {tab === 'addresses' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-2xl">Saved Addresses</h2>
                <button onClick={() => setShowAddrForm(!showAddrForm)} className="btn btn-outline btn-sm">
                  {showAddrForm ? '✕ Cancel' : '+ Add Address'}
                </button>
              </div>

              {showAddrForm && (
                <form onSubmit={handleAddAddress} className="border border-gray-200 p-5 mb-6">
                  <h3 className="font-medium text-sm mb-4">New Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div><label className="form-label">Full Name *</label><input type="text" className="form-input" value={addrForm.name} onChange={e => setAddrForm({...addrForm, name: e.target.value})} /></div>
                    <div><label className="form-label">Phone *</label><input type="tel" className="form-input" value={addrForm.phone} onChange={e => setAddrForm({...addrForm, phone: e.target.value})} /></div>
                    <div className="md:col-span-2"><label className="form-label">Address Line 1 *</label><input type="text" className="form-input" placeholder="Building, street, area" value={addrForm.line1} onChange={e => setAddrForm({...addrForm, line1: e.target.value})} /></div>
                    <div className="md:col-span-2"><label className="form-label">Landmark (optional)</label><input type="text" className="form-input" value={addrForm.line2} onChange={e => setAddrForm({...addrForm, line2: e.target.value})} /></div>
                    <div><label className="form-label">City *</label><input type="text" className="form-input" value={addrForm.city} onChange={e => setAddrForm({...addrForm, city: e.target.value})} /></div>
                    <div><label className="form-label">Pincode *</label><input type="text" className="form-input" value={addrForm.pincode} onChange={e => setAddrForm({...addrForm, pincode: e.target.value})} /></div>
                    <div>
                      <label className="form-label">State *</label>
                      <select className="form-select" value={addrForm.state} onChange={e => setAddrForm({...addrForm, state: e.target.value})}>
                        <option value="">Select state</option>
                        {indiaStates.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input type="checkbox" id="default" checked={addrForm.is_default} onChange={e => setAddrForm({...addrForm, is_default: e.target.checked})} />
                      <label htmlFor="default" className="text-sm text-gray-600">Set as default address</label>
                    </div>
                  </div>
                  <button type="submit" disabled={savingAddr} className="btn btn-primary mt-4">
                    {savingAddr ? <><div className="spinner spinner-sm spinner-white" /> Saving...</> : 'Save Address'}
                  </button>
                </form>
              )}

              {addresses.length === 0 && !showAddrForm ? (
                <div className="text-center py-12 border border-dashed border-gray-200">
                  <p className="text-3xl mb-3">📍</p>
                  <p className="text-gray-400 text-sm">No saved addresses yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map(a => (
                    <div key={a.id} className={`border-2 p-4 relative ${a.is_default ? 'border-luxury-black' : 'border-gray-200'}`}>
                      {a.is_default && <span className="absolute top-3 right-3 badge badge-new text-[9px]">Default</span>}
                      <p className="font-medium text-sm">{a.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{a.phone}</p>
                      <p className="text-sm text-gray-600 mt-2 leading-relaxed">{a.line1}{a.line2 ? ', ' + a.line2 : ''}, {a.city}, {a.state} — {a.pincode}</p>
                      <div className="flex gap-3 mt-4">
                        {!a.is_default && <button onClick={() => handleSetDefault(a.id)} className="text-xs text-gold-dark underline hover:text-gold">Set Default</button>}
                        <button onClick={() => handleDeleteAddress(a.id)} className="text-xs text-red-400 underline hover:text-red-600">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // var indiaStates = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Puducherry','Chandigarh'];
}
