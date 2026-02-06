'use client';

import { useState, useEffect } from 'react';
import { alertsApi } from '@/lib/api';
import { useIsAdmin } from '@/lib/auth';
import { cn, formatDate, formatRelativeTime, getSeverityColor } from '@/lib/utils';
import {
  Bell,
  RefreshCw,
  Check,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  MapPin,
  Filter,
} from 'lucide-react';

interface Alert {
  id: string;
  device_id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string | null;
  latitude: number | null;
  longitude: number | null;
  is_acknowledged: boolean;
  is_resolved: boolean;
  created_at: string;
  device_asset_id: string | null;
  device_name: string | null;
  employee_name: string | null;
}

interface AlertStats {
  total: number;
  unacknowledged: number;
  by_severity: Record<string, number>;
  by_type: Record<string, number>;
}

const severityIcons: Record<string, React.ElementType> = {
  critical: AlertCircle,
  high: AlertTriangle,
  medium: AlertTriangle,
  low: Info,
};

export default function AlertsPage() {
  const isAdmin = useIsAdmin();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const perPage = 20;

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const [alertsRes, statsRes] = await Promise.all([
        alertsApi.list({
          page,
          per_page: perPage,
          severity: severityFilter || undefined,
          is_resolved: statusFilter === 'resolved' ? true : statusFilter === 'active' ? false : undefined,
        }),
        alertsApi.getStats(),
      ]);
      setAlerts(alertsRes.data.alerts);
      setTotal(alertsRes.data.total);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [page, severityFilter, statusFilter]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await alertsApi.acknowledge(alertId);
      fetchAlerts();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      await alertsApi.resolve(alertId);
      fetchAlerts();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
          <p className="text-gray-500">Monitor security and geofence alerts</p>
        </div>
        {stats && stats.unacknowledged > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
            <Bell className="h-5 w-5 text-red-600" />
            <span className="text-red-700 font-medium">{stats.unacknowledged} unacknowledged</span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Critical</p>
                <p className="text-2xl font-bold text-red-600">{stats.by_severity.critical || 0}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">High</p>
                <p className="text-2xl font-bold text-orange-600">{stats.by_severity.high || 0}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Medium</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.by_severity.medium || 0}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Info className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Low</p>
                <p className="text-2xl font-bold text-blue-600">{stats.by_severity.low || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          className="input w-40"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
        >
          <option value="">All Severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          className="input w-40"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="resolved">Resolved</option>
        </select>
        <button
          onClick={fetchAlerts}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {loading ? (
          <div className="card flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-primary-600" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="card text-center py-12">
            <Bell className="h-12 w-12 text-gray-300 mx-auto" />
            <p className="mt-4 text-gray-500">No alerts found</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const SeverityIcon = severityIcons[alert.severity] || Info;
            return (
              <div
                key={alert.id}
                className={cn(
                  'card border-l-4',
                  getSeverityColor(alert.severity),
                  alert.is_resolved && 'opacity-60'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={cn('p-2 rounded-lg', getSeverityColor(alert.severity))}>
                      <SeverityIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{alert.title}</h3>
                        {alert.is_resolved && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            Resolved
                          </span>
                        )}
                        {!alert.is_resolved && alert.is_acknowledged && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                            Acknowledged
                          </span>
                        )}
                      </div>
                      {alert.message && (
                        <p className="mt-1 text-sm text-gray-600">{alert.message}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        {alert.device_asset_id && (
                          <span>Device: {alert.device_name || alert.device_asset_id}</span>
                        )}
                        {alert.employee_name && <span>Employee: {alert.employee_name}</span>}
                        {alert.latitude && alert.longitude && (
                          <a
                            href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary-600 hover:text-primary-700 hover:underline"
                          >
                            <MapPin className="h-4 w-4" />
                            {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                          </a>
                        )}
                        <span>{formatRelativeTime(alert.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  {isAdmin && !alert.is_resolved && (
                    <div className="flex items-center gap-2">
                      {!alert.is_acknowledged && (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="btn-secondary flex items-center gap-1 text-sm"
                        >
                          <Check className="h-4 w-4" />
                          Acknowledge
                        </button>
                      )}
                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="btn-primary flex items-center gap-1 text-sm"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Resolve
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {total > perPage && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, total)} of {total} alerts
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
  );
}
