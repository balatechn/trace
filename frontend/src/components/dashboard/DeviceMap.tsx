'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import of Leaflet map to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Circle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
  { ssr: false }
);

import 'leaflet/dist/leaflet.css';

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

interface GeofenceData {
  id: string;
  name: string;
  fence_type: string;
  center_latitude: number | null;
  center_longitude: number | null;
  radius_meters: number | null;
  is_active: boolean;
}

interface DeviceMapProps {
  devices: DeviceLocation[];
  geofences?: GeofenceData[];
  center?: [number, number];
  zoom?: number;
  onDeviceClick?: (deviceId: string) => void;
}

export default function DeviceMap({
  devices,
  geofences = [],
  center = [40.7128, -74.006], // Default to NYC
  zoom = 10,
  onDeviceClick,
}: DeviceMapProps) {
  const [mounted, setMounted] = useState(false);
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    
    // Import Leaflet on client side
    import('leaflet').then((leaflet) => {
      setL(leaflet.default);
      
      // Fix default icon issue
      delete (leaflet.default.Icon.Default.prototype as any)._getIconUrl;
      leaflet.default.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
    });
  }, []);

  if (!mounted || !L) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading map...</p>
        </div>
      </div>
    );
  }

  // Create custom icons
  const createIcon = (status: string) => {
    const color = status === 'online' ? '#22c55e' : status === 'locked' ? '#ef4444' : '#6b7280';
    
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: ${color};
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  // Calculate center based on devices if available
  const mapCenter: [number, number] = devices.length > 0
    ? [
        devices.reduce((sum, d) => sum + d.latitude, 0) / devices.length,
        devices.reduce((sum, d) => sum + d.longitude, 0) / devices.length,
      ]
    : center;

  return (
    <MapContainer
      center={mapCenter}
      zoom={zoom}
      style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Geofence circles */}
      {geofences
        .filter((g) => g.fence_type === 'circle' && g.center_latitude && g.center_longitude)
        .map((geofence) => (
          <Circle
            key={geofence.id}
            center={[geofence.center_latitude!, geofence.center_longitude!]}
            radius={geofence.radius_meters || 1000}
            pathOptions={{
              color: geofence.is_active ? '#3b82f6' : '#9ca3af',
              fillColor: geofence.is_active ? '#3b82f6' : '#9ca3af',
              fillOpacity: 0.1,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-medium">{geofence.name}</p>
                <p className="text-gray-500">Radius: {geofence.radius_meters}m</p>
              </div>
            </Popup>
          </Circle>
        ))}
      
      {/* Device markers */}
      {devices.map((device) => (
        <Marker
          key={device.device_id}
          position={[device.latitude, device.longitude]}
          icon={createIcon(device.status)}
          eventHandlers={{
            click: () => onDeviceClick?.(device.device_id),
          }}
        >
          <Popup>
            <div className="text-sm min-w-[200px]">
              <p className="font-medium text-gray-900">{device.device_name || device.asset_id}</p>
              {device.employee_name && (
                <p className="text-gray-600">{device.employee_name}</p>
              )}
              {device.department && (
                <p className="text-gray-500 text-xs">{device.department}</p>
              )}
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Status: <span className={device.status === 'online' ? 'text-green-600' : 'text-gray-600'}>{device.status}</span>
                </p>
                {device.location_source && (
                  <p className="text-xs text-gray-500">Source: {device.location_source}</p>
                )}
                {device.accuracy && (
                  <p className="text-xs text-gray-500">Accuracy: {Math.round(device.accuracy)}m</p>
                )}
                {device.last_seen && (
                  <p className="text-xs text-gray-500">
                    Last seen: {new Date(device.last_seen).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
