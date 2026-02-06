import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM dd, yyyy HH:mm');
}

export function formatDateShort(date: string | Date): string {
  return format(new Date(date), 'MMM dd, yyyy');
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'online':
      return 'text-green-600 bg-green-100';
    case 'offline':
      return 'text-gray-600 bg-gray-100';
    case 'locked':
      return 'text-red-600 bg-red-100';
    case 'wiped':
      return 'text-purple-600 bg-purple-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'critical':
      return 'text-red-700 bg-red-100 border-red-200';
    case 'high':
      return 'text-orange-700 bg-orange-100 border-orange-200';
    case 'medium':
      return 'text-yellow-700 bg-yellow-100 border-yellow-200';
    case 'low':
      return 'text-blue-700 bg-blue-100 border-blue-200';
    default:
      return 'text-gray-700 bg-gray-100 border-gray-200';
  }
}

export function getRoleColor(role: string): string {
  switch (role) {
    case 'super_admin':
      return 'text-purple-700 bg-purple-100';
    case 'it_admin':
      return 'text-blue-700 bg-blue-100';
    case 'viewer':
      return 'text-gray-700 bg-gray-100';
    default:
      return 'text-gray-700 bg-gray-100';
  }
}

export function formatRole(role: string): string {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'it_admin':
      return 'IT Admin';
    case 'viewer':
      return 'Viewer';
    default:
      return role;
  }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}
