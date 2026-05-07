import React, { useEffect, useState, useCallback } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const [users, setUsers]   = useState([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole]     = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page, limit:20 });
      if (search) q.set('search', search);
      if (role)   q.set('role', role);
      const r = await api.get(`/admin/users?${q}`);
      setUsers(r.data.users); setTotal(r.data.total);
    } catch {} finally { setLoading(false); }
  }, [page, search, role]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleStatus = async (id, isActive) => {
    try {
      await api.put(`/admin/users/${id}`, { is_active: !isActive });
      toast.success(`User ${!isActive ? 'activated' : 'deactivated'}.`);
      fetchUsers();
    } catch { toast.error('Failed to update user.'); }
  };

  const changeRole = async (id, newRole) => {
    try {
      await api.put(`/admin/users/${id}`, { role: newRole });
      toast.success('User role updated.');
      fetchUsers();
    } catch { toast.error('Failed to update role.'); }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200">
        <div className="flex flex-wrap gap-3 p-4 border-b border-gray-100">
          <div className="relative flex-1 min-w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input className="form-input pl-9 py-2 text-sm" placeholder="Search by name or email..."
              value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="form-select py-2 text-sm w-auto" value={role} onChange={e=>{ setRole(e.target.value); setPage(1); }}>
            <option value="">All Roles</option>
            <option value="customer">Customer</option>
            <option value="admin">Admin</option>
            <option value="superadmin">Superadmin</option>
          </select>
        </div>

        <table className="data-table">
          <thead>
            <tr><th>User</th><th>Phone</th><th>Role</th><th>Orders</th><th>Verified</th><th>Joined</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12"><div className="spinner spinner-gold mx-auto" /></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">No users found</td></tr>
            ) : users.map(u => (
              <tr key={u.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gold flex items-center justify-center text-luxury-black text-xs font-semibold flex-shrink-0">
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="text-xs text-gray-500">{u.phone || '—'}</td>
                <td>
                  <select className="text-xs border border-gray-200 px-2 py-1 rounded bg-white" value={u.role} onChange={e => changeRole(u.id, e.target.value)}>
                    <option value="customer">Customer</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </td>
                <td className="text-sm text-center">{u.order_count || 0}</td>
                <td>
                  {u.is_verified
                    ? <span className="badge badge-success text-[9px]">Verified</span>
                    : <span className="badge bg-gray-100 text-gray-400 text-[9px]">Unverified</span>
                  }
                </td>
                <td className="text-xs text-gray-400 whitespace-nowrap">{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                <td>
                  <span className={`badge text-[9px] ${u.is_active ? 'badge-success' : 'bg-red-50 text-red-500'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button onClick={() => toggleStatus(u.id, u.is_active)}
                    className={`text-xs underline ${u.is_active ? 'text-red-400 hover:text-red-600' : 'text-green-500 hover:text-green-700'}`}>
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">{total} total users</p>
          <div className="flex gap-1">
            <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="w-8 h-8 border border-gray-200 text-sm flex items-center justify-center hover:border-luxury-black disabled:opacity-30">←</button>
            <span className="w-8 h-8 flex items-center justify-center text-xs">{page}</span>
            <button disabled={users.length<20} onClick={()=>setPage(p=>p+1)} className="w-8 h-8 border border-gray-200 text-sm flex items-center justify-center hover:border-luxury-black disabled:opacity-30">→</button>
          </div>
        </div>
      </div>
    </div>
  );
}
