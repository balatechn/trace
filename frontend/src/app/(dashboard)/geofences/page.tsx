'use client';

import { useState, useEffect } from 'react';
import { geofencesApi } from '@/lib/api';
import { useIsAdmin } from '@/lib/auth';
import { cn, formatDate } from '@/lib/utils';
import {
  MapPin,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  Circle,
  Hexagon,
  ToggleLeft,
  ToggleRight,
  Bell,
  BellOff,
} from 'lucide-react';

interface Geofence {
  id: string;
  name: string;
  description: string | null;
  fence_type: string;
  center_latitude: number | null;
  center_longitude: number | null;
  radius_meters: number | null;
  is_active: boolean;
  alert_on_exit: boolean;
  alert_on_enter: boolean;
  department: string | null;
  created_at: string;
}

export default function GeofencesPage() {
  const isAdmin = useIsAdmin();
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  const fetchGeofences = async () => {
    setLoading(true);
    try {
      const response = await geofencesApi.list({
        is_active: showInactive ? undefined : true,
      });
      setGeofences(response.data.geofences);
    } catch (error) {
      console.error('Failed to fetch geofences:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGeofences();
  }, [showInactive]);

  const handleToggleActive = async (geofence: Geofence) => {
    try {
      await geofencesApi.update(geofence.id, { is_active: !geofence.is_active });
      fetchGeofences();
    } catch (error) {
      console.error('Failed to update geofence:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this geofence?')) return;
    
    try {
      await geofencesApi.delete(id);
      fetchGeofences();
    } catch (error) {
      console.error('Failed to delete geofence:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Geofences</h1>
          <p className="text-gray-500">Define allowed zones for devices</p>
        </div>
        {isAdmin && (
          <button className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Geofence
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">Show inactive</span>
        </label>
        <button
          onClick={fetchGeofences}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Geofences Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-primary-600" />
        </div>
      ) : geofences.length === 0 ? (
        <div className="card text-center py-12">
          <MapPin className="h-12 w-12 text-gray-300 mx-auto" />
          <p className="mt-4 text-gray-500">No geofences defined</p>
          {isAdmin && (
            <button className="mt-4 btn-primary">Create your first geofence</button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {geofences.map((geofence) => (
            <div
              key={geofence.id}
              className={cn(
                'card',
                !geofence.is_active && 'opacity-60'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    geofence.fence_type === 'circle'
                      ? 'bg-blue-100'
                      : 'bg-purple-100'
                  )}>
                    {geofence.fence_type === 'circle' ? (
                      <Circle className={cn(
                        'h-5 w-5',
                        geofence.fence_type === 'circle'
                          ? 'text-blue-600'
                          : 'text-purple-600'
                      )} />
                    ) : (
                      <Hexagon className="h-5 w-5 text-purple-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{geofence.name}</h3>
                    {geofence.description && (
                      <p className="text-sm text-gray-500">{geofence.description}</p>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleToggleActive(geofence)}
                    className={cn(
                      'p-1',
                      geofence.is_active ? 'text-green-600' : 'text-gray-400'
                    )}
                    title={geofence.is_active ? 'Active' : 'Inactive'}
                  >
                    {geofence.is_active ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                )}
              </div>

              <div className="mt-4 space-y-2 text-sm">
                {geofence.fence_type === 'circle' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Radius</span>
                      <span className="text-gray-900">{geofence.radius_meters}m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Center</span>
                      <span className="text-gray-900 font-mono text-xs">
                        {geofence.center_latitude?.toFixed(4)}, {geofence.center_longitude?.toFixed(4)}
                      </span>
                    </div>
                  </>
                )}
                {geofence.department && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Department</span>
                    <span className="text-gray-900">{geofence.department}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Alerts</span>
                  <div className="flex items-center gap-2">
                    {geofence.alert_on_exit && (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                        Exit
                      </span>
                    )}
                    {geofence.alert_on_enter && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                        Enter
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-2">
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(geofence.id)}
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
