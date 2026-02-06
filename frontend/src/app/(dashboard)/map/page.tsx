'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { locationsApi, geofencesApi } from '@/lib/api';
import { cn, formatRelativeTime, getStatusColor, formatStatus } from '@/lib/utils';
import {
  RefreshCw,
  MapPin,
  Filter,
  Laptop,
  X,
  Navigation,
  Clock,
  Building2,
} from 'lucide-react';

// Dynamic import of map component
const DeviceMap = dynamic(
  () => import('@/components/dashboard/DeviceMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading map...</p>
        </div>
      </div>
    ),
  }
);

interface DeviceLocation {
  device_id: string;
  asset_id: string;
  device_name: string | null;
  employee_name: string | null;
  department: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  location_source: string | null;
  last_seen: string | null;
  status: string;
}

export default function MapPage() {
  const [devices, setDevices] = useState<DeviceLocation[]>([]);
  const [geofences, setGeofences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<DeviceLocation | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [showGeofences, setShowGeofences] = useState(true);
  const [onlineCount, setOnlineCount] = useState(0);
  const [offlineCount, setOfflineCount] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [locationsRes, geofencesRes] = await Promise.all([
        locationsApi.getAll({ department: departmentFilter || undefined }),
        geofencesApi.list({ is_active: true }),
      ]);
      
      setDevices(locationsRes.data.devices);
      setOnlineCount(locationsRes.data.online_count);
      setOfflineCount(locationsRes.data.offline_count);
      setGeofences(geofencesRes.data.geofences);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [departmentFilter]);

  const handleDeviceClick = (deviceId: string) => {
    const device = devices.find((d) => d.device_id === deviceId);
    setSelectedDevice(device || null);
  };

  // Get unique departments
  const departments = [...new Set(devices.map((d) => d.department).filter(Boolean))];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Map</h1>
          <p className="text-gray-500">Real-time device locations</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-green-500"></span>
              Online: {onlineCount}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-gray-400"></span>
              Offline: {offlineCount}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          className="input w-48"
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept as string}>
              {dept}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showGeofences}
            onChange={(e) => setShowGeofences(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">Show Geofences</span>
        </label>
        <button
          onClick={fetchData}
          disabled={loading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Map and Device Panel */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Map */}
        <div className="flex-1 card p-0 overflow-hidden">
          <DeviceMap
            devices={devices}
            geofences={showGeofences ? geofences : []}
            onDeviceClick={handleDeviceClick}
          />
        </div>

        {/* Device Details Panel */}
        {selectedDevice && (
          <div className="w-80 card flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Device Details</h3>
              <button
                onClick={() => setSelectedDevice(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Device Info */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Laptop className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedDevice.device_name || selectedDevice.asset_id}
                  </p>
                  <p className="text-sm text-gray-500">{selectedDevice.asset_id}</p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between py-2 border-t border-gray-100">
                <span className="text-sm text-gray-500">Status</span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    getStatusColor(selectedDevice.status)
                  )}
                >
                  {formatStatus(selectedDevice.status)}
                </span>
              </div>

              {/* Employee */}
              {selectedDevice.employee_name && (
                <div className="flex items-center justify-between py-2 border-t border-gray-100">
                  <span className="text-sm text-gray-500">Employee</span>
                  <span className="text-sm text-gray-900">{selectedDevice.employee_name}</span>
                </div>
              )}

              {/* Department */}
              {selectedDevice.department && (
                <div className="flex items-center justify-between py-2 border-t border-gray-100">
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    Department
                  </span>
                  <span className="text-sm text-gray-900">{selectedDevice.department}</span>
                </div>
              )}

              {/* Location */}
              <div className="py-2 border-t border-gray-100">
                <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                  <MapPin className="h-4 w-4" />
                  Location
                </div>
                <p className="text-sm text-gray-900">
                  {selectedDevice.latitude.toFixed(6)}, {selectedDevice.longitude.toFixed(6)}
                </p>
                {selectedDevice.accuracy && (
                  <p className="text-xs text-gray-500">
                    Accuracy: {Math.round(selectedDevice.accuracy)}m
                  </p>
                )}
                {selectedDevice.location_source && (
                  <p className="text-xs text-gray-500">
                    Source: {selectedDevice.location_source}
                  </p>
                )}
              </div>

              {/* Last Seen */}
              {selectedDevice.last_seen && (
                <div className="flex items-center justify-between py-2 border-t border-gray-100">
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Last Seen
                  </span>
                  <span className="text-sm text-gray-900">
                    {formatRelativeTime(selectedDevice.last_seen)}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-gray-100">
                <button className="w-full btn-primary flex items-center justify-center gap-2">
                  <Navigation className="h-4 w-4" />
                  View History
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
