'use client';

import { useState, useEffect } from 'react';
import { useIsAdmin } from '@/lib/auth';
import { 
  Settings, 
  Shield, 
  Lock, 
  Trash2, 
  Bell, 
  MapPin,
  Save,
  RefreshCw,
} from 'lucide-react';

interface PolicySettings {
  // Remote Actions
  remote_lock_enabled: boolean;
  remote_wipe_enabled: boolean;
  require_wipe_confirmation: boolean;
  
  // Location Tracking
  location_tracking_enabled: boolean;
  location_update_interval: number; // minutes
  
  // Alerts
  geofence_alerts_enabled: boolean;
  offline_alerts_enabled: boolean;
  offline_threshold_hours: number;
  
  // Security
  require_encryption: boolean;
  auto_lock_on_geofence_breach: boolean;
}

const defaultSettings: PolicySettings = {
  remote_lock_enabled: true,
  remote_wipe_enabled: true,
  require_wipe_confirmation: true,
  location_tracking_enabled: true,
  location_update_interval: 15,
  geofence_alerts_enabled: true,
  offline_alerts_enabled: true,
  offline_threshold_hours: 24,
  require_encryption: false,
  auto_lock_on_geofence_breach: false,
};

export default function SettingsPage() {
  const isAdmin = useIsAdmin();
  const [settings, setSettings] = useState<PolicySettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load settings from localStorage (in production, this would be from the API)
    const savedSettings = localStorage.getItem('trace_policy_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to localStorage (in production, this would go to the API)
      localStorage.setItem('trace_policy_settings', JSON.stringify(settings));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-300 mx-auto" />
          <p className="mt-4 text-gray-500">You don't have permission to view settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Policy Settings</h1>
          <p className="text-gray-500">Configure device management policies</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      {/* Remote Actions */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Lock className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Remote Actions</h2>
            <p className="text-sm text-gray-500">Control remote lock and wipe capabilities</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900">Enable Remote Lock</p>
              <p className="text-sm text-gray-500">Allow administrators to remotely lock devices</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.remote_lock_enabled}
                onChange={(e) => setSettings({ ...settings, remote_lock_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-2 border-t">
            <div>
              <p className="font-medium text-gray-900">Enable Remote Wipe</p>
              <p className="text-sm text-gray-500">Allow administrators to remotely wipe device data</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.remote_wipe_enabled}
                onChange={(e) => setSettings({ ...settings, remote_wipe_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-2 border-t">
            <div>
              <p className="font-medium text-gray-900">Require Wipe Confirmation</p>
              <p className="text-sm text-gray-500">Require explicit confirmation before wiping a device</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.require_wipe_confirmation}
                onChange={(e) => setSettings({ ...settings, require_wipe_confirmation: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Location Tracking */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MapPin className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Location Tracking</h2>
            <p className="text-sm text-gray-500">Configure location tracking behavior</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900">Enable Location Tracking</p>
              <p className="text-sm text-gray-500">Track device locations via agent pings</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.location_tracking_enabled}
                onChange={(e) => setSettings({ ...settings, location_tracking_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-2 border-t">
            <div>
              <p className="font-medium text-gray-900">Location Update Interval</p>
              <p className="text-sm text-gray-500">How often agents should report location</p>
            </div>
            <select
              className="input w-32"
              value={settings.location_update_interval}
              onChange={(e) => setSettings({ ...settings, location_update_interval: parseInt(e.target.value) })}
            >
              <option value={5}>5 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Bell className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Alerts</h2>
            <p className="text-sm text-gray-500">Configure alert triggers</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900">Geofence Alerts</p>
              <p className="text-sm text-gray-500">Alert when devices leave defined geofences</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.geofence_alerts_enabled}
                onChange={(e) => setSettings({ ...settings, geofence_alerts_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-2 border-t">
            <div>
              <p className="font-medium text-gray-900">Offline Alerts</p>
              <p className="text-sm text-gray-500">Alert when devices go offline</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.offline_alerts_enabled}
                onChange={(e) => setSettings({ ...settings, offline_alerts_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-2 border-t">
            <div>
              <p className="font-medium text-gray-900">Offline Threshold</p>
              <p className="text-sm text-gray-500">Mark device offline after this duration</p>
            </div>
            <select
              className="input w-32"
              value={settings.offline_threshold_hours}
              onChange={(e) => setSettings({ ...settings, offline_threshold_hours: parseInt(e.target.value) })}
            >
              <option value={1}>1 hour</option>
              <option value={6}>6 hours</option>
              <option value={12}>12 hours</option>
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
            </select>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-lg">
            <Shield className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Security Policies</h2>
            <p className="text-sm text-gray-500">Configure security enforcement</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900">Require Device Encryption</p>
              <p className="text-sm text-gray-500">Alert if device encryption is disabled</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.require_encryption}
                onChange={(e) => setSettings({ ...settings, require_encryption: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-2 border-t">
            <div>
              <p className="font-medium text-gray-900">Auto-Lock on Geofence Breach</p>
              <p className="text-sm text-gray-500">Automatically lock device when leaving geofence</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_lock_on_geofence_breach}
                onChange={(e) => setSettings({ ...settings, auto_lock_on_geofence_breach: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
