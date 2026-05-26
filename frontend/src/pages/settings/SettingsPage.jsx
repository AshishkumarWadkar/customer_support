import { useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const SettingsPage = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axiosInstance.get('/settings')
      .then(({ data }) => {
        const map = {};
        data.data?.forEach(s => { map[`${s.category}.${s.key_name}`] = s.value; });
        setSettings(map);
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (category, keyName, value) => {
    setSaving(true);
    try {
      await axiosInstance.put('/settings', { settings: [{ category, keyName, value }] });
      toast.success('Setting saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Cog6ToothIcon className="h-7 w-7 text-slate-400" />
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      </div>
      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />)}</div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4">General</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input type="text" defaultValue={settings['general.company_name']}
                  onBlur={(e) => save('general', 'company_name', e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Support Email</label>
                <input type="email" defaultValue={settings['general.support_email']}
                  onBlur={(e) => save('general', 'support_email', e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Security</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Max Login Attempts</label>
                <input type="number" defaultValue={settings['security.max_login_attempts']}
                  onBlur={(e) => save('security', 'max_login_attempts', e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Session Timeout (minutes)</label>
                <input type="number" defaultValue={settings['security.session_timeout_mins']}
                  onBlur={(e) => save('security', 'session_timeout_mins', e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
