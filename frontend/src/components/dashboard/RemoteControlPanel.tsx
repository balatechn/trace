'use client';

import { useState, useEffect } from 'react';
import { 
  Lock, 
  Unlock, 
  Power, 
  RotateCcw, 
  Camera, 
  MessageSquare, 
  Monitor,
  Terminal,
  X,
  Check,
  Loader2,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Device {
  id: string;
  serial_number: string;
  asset_id: string;
  device_name: string | null;
  employee_name: string | null;
  status: string;
  is_locked: boolean;
}

interface Command {
  id: string;
  type: string;
  status: string;
  created_at: string;
  executed_at: string | null;
  result: string | null;
  screenshot_data: string | null;
}

interface RemoteControlPanelProps {
  device: Device;
  onClose: () => void;
  onRefresh?: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export function RemoteControlPanel({ device, onClose, onRefresh }: RemoteControlPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [commandHistory, setCommandHistory] = useState<Command[]>([]);
  const [showScreenshot, setShowScreenshot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  };

  const sendCommand = async (commandType: string, payload?: Record<string, unknown>) => {
    setLoading(commandType);
    setError(null);
    setSuccess(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/commands/${commandType}/${device.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: payload ? JSON.stringify(payload) : undefined,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Command failed');
      }

      const data = await response.json();
      setSuccess(`${commandType.charAt(0).toUpperCase() + commandType.slice(1)} command sent successfully`);
      
      // Add to history
      if (data.id) {
        setCommandHistory(prev => [{
          id: data.id,
          type: commandType,
          status: 'pending',
          created_at: new Date().toISOString(),
          executed_at: null,
          result: null,
          screenshot_data: null,
        }, ...prev]);
      }

      // Refresh device status after a short delay
      setTimeout(() => {
        onRefresh?.();
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Command failed');
    } finally {
      setLoading(null);
    }
  };

  const handleLock = () => sendCommand('lock');
  const handleRestart = () => {
    if (confirm('Are you sure you want to restart this device? Any unsaved work will be lost.')) {
      sendCommand('restart');
    }
  };
  const handleShutdown = () => {
    if (confirm('Are you sure you want to shutdown this device? The user will lose access until it is turned back on.')) {
      sendCommand('shutdown');
    }
  };
  const handleScreenshot = () => sendCommand('screenshot');
  const handleSendMessage = () => {
    if (message.trim()) {
      sendCommand('message', { message: message.trim(), title: 'IT Admin Message' });
      setMessage('');
    }
  };

  const fetchCommandHistory = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/commands/history/${device.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCommandHistory(data);
      }
    } catch (err) {
      console.error('Failed to fetch command history:', err);
    }
  };

  // Fetch command history on mount
  useEffect(() => {
    fetchCommandHistory();
  }, [device.id]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary-600" />
              Remote Control
            </h2>
            <p className="text-sm text-gray-500">
              {device.device_name || device.asset_id} • {device.employee_name || 'Unassigned'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            {error}
          </div>
        )}
        {success && (
          <div className="mx-4 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <Check className="h-5 w-5" />
            {success}
          </div>
        )}

        {/* Device Status */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={cn(
                "w-3 h-3 rounded-full",
                device.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
              )} />
              <span className="text-sm font-medium">
                {device.status === 'online' ? 'Online' : 'Offline'}
              </span>
            </div>
            {device.is_locked && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                <Lock className="h-3 w-3" />
                Locked
              </span>
            )}
          </div>
          {device.status !== 'online' && (
            <p className="mt-2 text-sm text-amber-600">
              ⚠️ Device is offline. Commands will be queued and executed when the device comes online.
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-b">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={handleLock}
              disabled={loading !== null}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                device.is_locked 
                  ? "border-green-200 bg-green-50 hover:bg-green-100" 
                  : "border-orange-200 bg-orange-50 hover:bg-orange-100"
              )}
            >
              {loading === 'lock' ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : device.is_locked ? (
                <Unlock className="h-6 w-6 text-green-600" />
              ) : (
                <Lock className="h-6 w-6 text-orange-600" />
              )}
              <span className="text-sm font-medium">
                {device.is_locked ? 'Unlock' : 'Lock'}
              </span>
            </button>

            <button
              onClick={handleRestart}
              disabled={loading !== null}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-all"
            >
              {loading === 'restart' ? (
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              ) : (
                <RotateCcw className="h-6 w-6 text-blue-600" />
              )}
              <span className="text-sm font-medium text-blue-700">Restart</span>
            </button>

            <button
              onClick={handleShutdown}
              disabled={loading !== null}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-red-200 bg-red-50 hover:bg-red-100 transition-all"
            >
              {loading === 'shutdown' ? (
                <Loader2 className="h-6 w-6 animate-spin text-red-600" />
              ) : (
                <Power className="h-6 w-6 text-red-600" />
              )}
              <span className="text-sm font-medium text-red-700">Shutdown</span>
            </button>

            <button
              onClick={handleScreenshot}
              disabled={loading !== null}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 transition-all"
            >
              {loading === 'screenshot' ? (
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              ) : (
                <Camera className="h-6 w-6 text-purple-600" />
              )}
              <span className="text-sm font-medium text-purple-700">Screenshot</span>
            </button>
          </div>
        </div>

        {/* Send Message */}
        <div className="p-4 border-b">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Send Message to User
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message to display on the device..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || loading !== null}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading === 'message' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Send</>
              )}
            </button>
          </div>
        </div>

        {/* Command History */}
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Recent Commands
          </h3>
          {commandHistory.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No commands sent yet</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {commandHistory.slice(0, 10).map((cmd) => (
                <div
                  key={cmd.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      cmd.status === 'executed' ? 'bg-green-500' :
                      cmd.status === 'failed' ? 'bg-red-500' :
                      cmd.status === 'sent' ? 'bg-yellow-500' :
                      'bg-gray-400'
                    )} />
                    <div>
                      <p className="text-sm font-medium capitalize">{cmd.type}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(cmd.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {cmd.status === 'pending' && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Pending
                      </span>
                    )}
                    {cmd.status === 'executed' && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Executed
                      </span>
                    )}
                    {cmd.status === 'failed' && (
                      <span className="text-xs text-red-600 flex items-center gap-1">
                        <X className="h-3 w-3" />
                        Failed
                      </span>
                    )}
                    {cmd.screenshot_data && (
                      <button
                        onClick={() => setShowScreenshot(cmd.screenshot_data)}
                        className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <Camera className="h-3 w-3" />
                        View
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Screenshot Modal */}
      {showScreenshot && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
          <div className="relative max-w-4xl w-full mx-4">
            <button
              onClick={() => setShowScreenshot(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X className="h-8 w-8" />
            </button>
            <img
              src={`data:image/jpeg;base64,${showScreenshot}`}
              alt="Device Screenshot"
              className="w-full rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
