'use client';

import { useState, useEffect } from 'react';
import { auditApi } from '@/lib/api';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';
import {
  FileText,
  RefreshCw,
  Filter,
  User,
  Laptop,
  MapPin,
  Shield,
  LogIn,
  LogOut,
  Key,
  Lock,
  Unlock,
  Trash2,
  Edit,
  Plus,
  Eye,
  Download,
} from 'lucide-react';

interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_identifier: string | null;
  description: string | null;
  ip_address: string | null;
  created_at: string;
}

interface AuditSummary {
  period_days: number;
  total_events: number;
  by_action: Record<string, number>;
  top_users: Record<string, number>;
  login_attempts: number;
  failed_logins: number;
}

const actionIcons: Record<string, React.ElementType> = {
  login: LogIn,
  logout: LogOut,
  login_failed: Key,
  password_change: Key,
  device_create: Plus,
  device_update: Edit,
  device_delete: Trash2,
  device_lock: Lock,
  device_unlock: Unlock,
  location_view: Eye,
  location_history_view: MapPin,
  location_export: Download,
  user_create: Plus,
  user_update: Edit,
  user_delete: Trash2,
};

const actionColors: Record<string, string> = {
  login: 'text-green-600 bg-green-100',
  logout: 'text-gray-600 bg-gray-100',
  login_failed: 'text-red-600 bg-red-100',
  password_change: 'text-blue-600 bg-blue-100',
  device_create: 'text-green-600 bg-green-100',
  device_update: 'text-blue-600 bg-blue-100',
  device_delete: 'text-red-600 bg-red-100',
  device_lock: 'text-orange-600 bg-orange-100',
  device_unlock: 'text-green-600 bg-green-100',
  device_wipe: 'text-red-600 bg-red-100',
  location_view: 'text-purple-600 bg-purple-100',
  location_history_view: 'text-purple-600 bg-purple-100',
  location_export: 'text-purple-600 bg-purple-100',
  user_create: 'text-green-600 bg-green-100',
  user_update: 'text-blue-600 bg-blue-100',
  user_delete: 'text-red-600 bg-red-100',
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 50;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsRes, summaryRes] = await Promise.all([
        auditApi.list({
          page,
          per_page: perPage,
          action: actionFilter || undefined,
        }),
        auditApi.getSummary(7),
      ]);
      setLogs(logsRes.data.logs);
      setTotal(logsRes.data.total);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, actionFilter]);

  const formatActionName = (action: string) => {
    return action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500">Track all system activity and access</p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <FileText className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Events (7 days)</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total_events}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <LogIn className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Logins</p>
                <p className="text-2xl font-bold text-green-600">{summary.login_attempts}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Key className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Failed Logins</p>
                <p className="text-2xl font-bold text-red-600">{summary.failed_logins}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MapPin className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Location Views</p>
                <p className="text-2xl font-bold text-purple-600">
                  {(summary.by_action.location_view || 0) + (summary.by_action.location_history_view || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          className="input w-48"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="">All Actions</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
          <option value="login_failed">Failed Login</option>
          <option value="device_create">Device Create</option>
          <option value="device_update">Device Update</option>
          <option value="device_lock">Device Lock</option>
          <option value="device_wipe">Device Wipe</option>
          <option value="location_view">Location View</option>
          <option value="location_history_view">Location History</option>
          <option value="user_create">User Create</option>
          <option value="user_update">User Update</option>
        </select>
        <button
          onClick={fetchData}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Audit Logs Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Target
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-primary-600 mx-auto" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const ActionIcon = actionIcons[log.action] || FileText;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm">
                        <p className="text-gray-900">{formatDate(log.created_at)}</p>
                        <p className="text-xs text-gray-500">{formatRelativeTime(log.created_at)}</p>
                      </td>
                      <td className="px-6 py-4">
                        {log.user_email ? (
                          <div>
                            <p className="text-sm font-medium text-gray-900">{log.user_email}</p>
                            <p className="text-xs text-gray-500">{log.user_role}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">System</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
                          actionColors[log.action] || 'text-gray-600 bg-gray-100'
                        )}>
                          <ActionIcon className="h-3 w-3" />
                          {formatActionName(log.action)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {log.target_identifier || log.target_type || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {log.description || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                        {log.ip_address || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > perPage && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, total)} of {total} logs
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
    </div>
  );
}
