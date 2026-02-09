'use client';

import { useState, useEffect } from 'react';
import { devicesApi } from '@/lib/api';
import { useIsAdmin } from '@/lib/auth';
import { cn, formatDate, formatRelativeTime, getStatusColor, formatStatus } from '@/lib/utils';
import { RemoteControlPanel } from '@/components/dashboard/RemoteControlPanel';
import {
  Laptop,
  Search,
  Plus,
  MoreVertical,
  RefreshCw,
  Filter,
  Lock,
  Unlock,
  Trash2,
  MapPin,
  Edit,
  Eye,
  X,
  AlertTriangle,
  Monitor,
} from 'lucide-react';

interface Device {
  id: string;
  serial_number: string;
  asset_id: string;
  device_name: string | null;
  device_type: string;
  employee_name: string | null;
  department: string | null;
  status: string;
  last_seen: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  is_locked: boolean;
  is_wiped: boolean;
}

interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  locked: number;
  by_department: Record<string, number>;
}

interface NewDevice {
  serial_number: string;
  asset_id: string;
  device_name: string;
  device_type: string;
  manufacturer: string;
  model: string;
  employee_name: string;
  department: string;
  // Mobile device fields
  imei: string;
  imei2: string;
  phone_number: string;
  carrier: string;
}

export default function DevicesPage() {
  const isAdmin = useIsAdmin();
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<DeviceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipingDevice, setWipingDevice] = useState<Device | null>(null);
  const [wipeReason, setWipeReason] = useState('');
  const [showRemoteControl, setShowRemoteControl] = useState(false);
  const [remoteControlDevice, setRemoteControlDevice] = useState<Device | null>(null);
  const [wipeConfirm, setWipeConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Policy settings
  const [policySettings, setPolicySettings] = useState({
    remote_lock_enabled: true,
    remote_wipe_enabled: true,
  });
  
  // Load policy settings
  useEffect(() => {
    const savedSettings = localStorage.getItem('trace_policy_settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setPolicySettings({
        remote_lock_enabled: settings.remote_lock_enabled ?? true,
        remote_wipe_enabled: settings.remote_wipe_enabled ?? true,
      });
    }
  }, []);
  
  const [newDevice, setNewDevice] = useState<NewDevice>({
    serial_number: '',
    asset_id: '',
    device_name: '',
    device_type: 'laptop',
    manufacturer: '',
    model: '',
    employee_name: '',
    department: '',
    imei: '',
    imei2: '',
    phone_number: '',
    carrier: '',
  });
  const perPage = 20;

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const [devicesRes, statsRes] = await Promise.all([
        devicesApi.list({
          page,
          per_page: perPage,
          search: search || undefined,
          status: statusFilter || undefined,
        }),
        devicesApi.getStats(),
      ]);
      setDevices(devicesRes.data.devices);
      setTotal(devicesRes.data.total);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [page, search, statusFilter]);

  const handleLock = async (deviceId: string) => {
    const reason = prompt('Enter lock reason:');
    if (!reason) return;
    
    try {
      await devicesApi.lock(deviceId, reason);
      fetchDevices();
    } catch (error) {
      console.error('Failed to lock device:', error);
    }
  };

  const handleUnlock = async (deviceId: string) => {
    try {
      await devicesApi.unlock(deviceId);
      fetchDevices();
    } catch (error) {
      console.error('Failed to unlock device:', error);
    }
  };

  const handleWipe = async () => {
    if (!wipingDevice || !wipeReason || !wipeConfirm) return;
    setSubmitting(true);
    try {
      await devicesApi.wipe(wipingDevice.id, wipeReason, wipeConfirm);
      setShowWipeModal(false);
      setWipingDevice(null);
      setWipeReason('');
      setWipeConfirm(false);
      fetchDevices();
      alert('Remote wipe command sent successfully!');
    } catch (error) {
      console.error('Failed to wipe device:', error);
      alert('Failed to send wipe command. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDevice.serial_number || !newDevice.asset_id) {
      alert('Serial Number and Asset ID are required');
      return;
    }
    setSubmitting(true);
    try {
      await devicesApi.create({
        serial_number: newDevice.serial_number,
        asset_id: newDevice.asset_id,
        device_name: newDevice.device_name || undefined,
        device_type: newDevice.device_type,
        manufacturer: newDevice.manufacturer || undefined,
        model: newDevice.model || undefined,
        employee_name: newDevice.employee_name || undefined,
        department: newDevice.department || undefined,
        imei: newDevice.imei || undefined,
        imei2: newDevice.imei2 || undefined,
        phone_number: newDevice.phone_number || undefined,
        carrier: newDevice.carrier || undefined,
      });
      setShowAddModal(false);
      setNewDevice({
        serial_number: '',
        asset_id: '',
        device_name: '',
        device_type: 'laptop',
        manufacturer: '',
        model: '',
        employee_name: '',
        department: '',
        imei: '',
        imei2: '',
        phone_number: '',
        carrier: '',
      });
      fetchDevices();
    } catch (error) {
      console.error('Failed to add device:', error);
      alert('Failed to add device. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice) return;
    setSubmitting(true);
    try {
      await devicesApi.update(editingDevice.id, {
        device_name: editingDevice.device_name || undefined,
        employee_name: editingDevice.employee_name || undefined,
        department: editingDevice.department || undefined,
      });
      setShowEditModal(false);
      setEditingDevice(null);
      fetchDevices();
    } catch (error) {
      console.error('Failed to update device:', error);
      alert('Failed to update device. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Devices</h1>
          <p className="text-gray-500">Manage and track company laptops</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Device
          </button>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Laptop className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Devices</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <div className="h-5 w-5 rounded-full bg-green-500"></div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Online</p>
                <p className="text-2xl font-bold text-green-600">{stats.online}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <div className="h-5 w-5 rounded-full bg-gray-400"></div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Offline</p>
                <p className="text-2xl font-bold text-gray-600">{stats.offline}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Lock className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Locked</p>
                <p className="text-2xl font-bold text-red-600">{stats.locked}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search devices..."
            className="input pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-full sm:w-48"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="locked">Locked</option>
        </select>
        <button
          onClick={fetchDevices}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Devices Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Seen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="h-6 w-6 animate-spin text-primary-600" />
                    </div>
                  </td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No devices found
                  </td>
                </tr>
              ) : (
                devices.map((device) => (
                  <tr key={device.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <Laptop className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {device.device_name || device.asset_id}
                          </p>
                          <p className="text-sm text-gray-500">{device.serial_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{device.employee_name || '-'}</p>
                      <p className="text-sm text-gray-500">{device.department || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        getStatusColor(device.status)
                      )}>
                        {formatStatus(device.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {device.last_seen ? formatRelativeTime(device.last_seen) : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      {device.last_latitude && device.last_longitude ? (
                        <a
                          href={`https://www.google.com/maps?q=${device.last_latitude},${device.last_longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary-600 hover:text-primary-700 hover:underline"
                        >
                          <MapPin className="h-4 w-4" />
                          <span className="text-sm">View</span>
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setRemoteControlDevice(device);
                            setShowRemoteControl(true);
                          }}
                          className="p-1 text-primary-600 hover:text-primary-700"
                          title="Remote Control"
                        >
                          <Monitor className="h-4 w-4" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => {
                                setEditingDevice(device);
                                setShowEditModal(true);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title="Edit device"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {policySettings.remote_lock_enabled && (
                              device.is_locked ? (
                                <button
                                  onClick={() => handleUnlock(device.id)}
                                  className="p-1 text-green-600 hover:text-green-700"
                                  title="Unlock device"
                                >
                                  <Unlock className="h-4 w-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleLock(device.id)}
                                  className="p-1 text-orange-600 hover:text-orange-700"
                                  title="Lock device"
                                >
                                  <Lock className="h-4 w-4" />
                                </button>
                              )
                            )}
                            {policySettings.remote_wipe_enabled && !device.is_wiped && (
                              <button
                                onClick={() => {
                                  setWipingDevice(device);
                                  setShowWipeModal(true);
                                }}
                                className="p-1 text-red-600 hover:text-red-700"
                                title="Remote wipe"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > perPage && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, total)} of {total} devices
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page * perPage >= total}
                className="btn-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Add New Device</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddDevice} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serial Number *
                </label>
                <input
                  type="text"
                  className="input"
                  value={newDevice.serial_number}
                  onChange={(e) => setNewDevice({ ...newDevice, serial_number: e.target.value })}
                  required
                  placeholder="e.g., ABC123XYZ"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asset ID *
                </label>
                <input
                  type="text"
                  className="input"
                  value={newDevice.asset_id}
                  onChange={(e) => setNewDevice({ ...newDevice, asset_id: e.target.value })}
                  required
                  placeholder="e.g., LAPTOP-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Name
                </label>
                <input
                  type="text"
                  className="input"
                  value={newDevice.device_name}
                  onChange={(e) => setNewDevice({ ...newDevice, device_name: e.target.value })}
                  placeholder="e.g., John's MacBook Pro"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Type
                </label>
                <select
                  className="input"
                  value={newDevice.device_type}
                  onChange={(e) => setNewDevice({ ...newDevice, device_type: e.target.value })}
                >
                  <option value="laptop">Laptop</option>
                  <option value="desktop">Desktop</option>
                  <option value="tablet">Tablet</option>
                  <option value="mobile">Mobile Phone</option>
                  <option value="workstation">Workstation</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={newDevice.manufacturer}
                    onChange={(e) => setNewDevice({ ...newDevice, manufacturer: e.target.value })}
                    placeholder="e.g., Apple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={newDevice.model}
                    onChange={(e) => setNewDevice({ ...newDevice, model: e.target.value })}
                    placeholder="e.g., MacBook Pro 14"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned Employee
                </label>
                <input
                  type="text"
                  className="input"
                  value={newDevice.employee_name}
                  onChange={(e) => setNewDevice({ ...newDevice, employee_name: e.target.value })}
                  placeholder="e.g., John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  className="input"
                  value={newDevice.department}
                  onChange={(e) => setNewDevice({ ...newDevice, department: e.target.value })}
                  placeholder="e.g., Engineering"
                />
              </div>
              
              {/* Mobile Device Fields */}
              {(newDevice.device_type === 'mobile' || newDevice.device_type === 'tablet') && (
                <>
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">Mobile Device Information</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        IMEI Number
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={newDevice.imei}
                        onChange={(e) => setNewDevice({ ...newDevice, imei: e.target.value })}
                        placeholder="e.g., 353456789012345"
                        maxLength={15}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        IMEI 2 (Dual SIM)
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={newDevice.imei2}
                        onChange={(e) => setNewDevice({ ...newDevice, imei2: e.target.value })}
                        placeholder="Optional"
                        maxLength={15}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        className="input"
                        value={newDevice.phone_number}
                        onChange={(e) => setNewDevice({ ...newDevice, phone_number: e.target.value })}
                        placeholder="e.g., +91 9876543210"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Carrier
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={newDevice.carrier}
                        onChange={(e) => setNewDevice({ ...newDevice, carrier: e.target.value })}
                        placeholder="e.g., Airtel, Jio"
                      />
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Device Modal */}
      {showEditModal && editingDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Edit Device</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingDevice(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditDevice} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serial Number
                </label>
                <input
                  type="text"
                  className="input bg-gray-100"
                  value={editingDevice.serial_number}
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asset ID
                </label>
                <input
                  type="text"
                  className="input bg-gray-100"
                  value={editingDevice.asset_id}
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Name
                </label>
                <input
                  type="text"
                  className="input"
                  value={editingDevice.device_name || ''}
                  onChange={(e) => setEditingDevice({ ...editingDevice, device_name: e.target.value })}
                  placeholder="e.g., John's MacBook Pro"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned Employee
                </label>
                <input
                  type="text"
                  className="input"
                  value={editingDevice.employee_name || ''}
                  onChange={(e) => setEditingDevice({ ...editingDevice, employee_name: e.target.value })}
                  placeholder="e.g., John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  className="input"
                  value={editingDevice.department || ''}
                  onChange={(e) => setEditingDevice({ ...editingDevice, department: e.target.value })}
                  placeholder="e.g., Engineering"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingDevice(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remote Wipe Confirmation Modal */}
      {showWipeModal && wipingDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b bg-red-50">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Remote Wipe Device</h2>
              </div>
              <button
                onClick={() => {
                  setShowWipeModal(false);
                  setWipingDevice(null);
                  setWipeReason('');
                  setWipeConfirm(false);
                }}
                className="p-1 hover:bg-red-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">⚠️ Warning: This action is irreversible!</p>
                <p className="text-red-700 text-sm mt-1">
                  Remote wipe will erase all data on the device. This action cannot be undone.
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">Device to wipe:</p>
                <p className="font-medium">{wipingDevice.device_name || wipingDevice.asset_id}</p>
                <p className="text-sm text-gray-500">{wipingDevice.serial_number}</p>
                {wipingDevice.employee_name && (
                  <p className="text-sm text-gray-500">Assigned to: {wipingDevice.employee_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for wipe *
                </label>
                <textarea
                  className="input"
                  rows={3}
                  value={wipeReason}
                  onChange={(e) => setWipeReason(e.target.value)}
                  placeholder="e.g., Device stolen, Employee termination, Security breach..."
                  required
                />
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="wipeConfirm"
                  checked={wipeConfirm}
                  onChange={(e) => setWipeConfirm(e.target.checked)}
                  className="mt-1"
                />
                <label htmlFor="wipeConfirm" className="text-sm text-gray-700">
                  I understand that this will permanently erase all data on this device and this action cannot be undone.
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowWipeModal(false);
                    setWipingDevice(null);
                    setWipeReason('');
                    setWipeConfirm(false);
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWipe}
                  disabled={submitting || !wipeReason || !wipeConfirm}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Wiping...' : 'Wipe Device'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remote Control Panel */}
      {showRemoteControl && remoteControlDevice && (
        <RemoteControlPanel
          device={remoteControlDevice}
          onClose={() => {
            setShowRemoteControl(false);
            setRemoteControlDevice(null);
          }}
          onRefresh={fetchDevices}
        />
      )}
    </div>
  );
}
