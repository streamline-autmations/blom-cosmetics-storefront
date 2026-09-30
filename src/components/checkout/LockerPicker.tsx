import React, { useState, useEffect } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { MapPin, Clock, Phone, Check } from 'lucide-react';

type PickupPoint = {
  id: string;
  name: string;
  street_address: string;
  local_area: string;
  city: string;
  zone: string;
  code: string;
  country: string;
  lat: number;
  lng: number;
  provider: string;
  hours?: string;
  phone?: string;
  distance?: number;
};

interface LockerPickerProps {
  value: PickupPoint | null;
  onChange: (point: PickupPoint) => void;
  className?: string;
}

export const LockerPicker: React.FC<LockerPickerProps> = ({
  value,
  onChange,
  className = ''
}) => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places']
  });

  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [center, setCenter] = useState<{lat: number; lng: number}>({ 
    lat: -26.2041, 
    lng: 28.0473 
  }); // Johannesburg default
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'locker' | 'counter'>('all');

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(userPos);
          setCenter(userPos);
        },
        (error) => {
          console.warn('Geolocation error:', error);
          // Keep default Johannesburg location
        }
      );
    }
  }, []);

  // Fetch pickup points
  const fetchPickupPoints = async (lat?: number, lng?: number) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (lat && lng) {
        params.append('lat', lat.toString());
        params.append('lng', lng.toString());
        params.append('order_closest', 'true');
      }
      if (typeFilter !== 'all') {
        params.append('type', typeFilter === 'locker' ? 'locker' : 'counter');
      }

      const response = await fetch(`/.netlify/functions/pickup-points?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch pickup points: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform data to our format
      const transformedPoints: PickupPoint[] = data.map((point: any) => ({
        id: point.id || point.code || point.pickup_point_id,
        name: point.name || point.title || 'Pickup Point',
        street_address: point.street_address || point.address || '',
        local_area: point.local_area || point.suburb || '',
        city: point.city || '',
        zone: point.zone || point.province || '',
        code: point.code || point.postal_code || '',
        country: point.country || 'ZA',
        lat: parseFloat(point.lat || point.latitude || 0),
        lng: parseFloat(point.lng || point.longitude || 0),
        provider: point.provider || 'tcg-locker',
        hours: point.hours || point.opening_hours || 'Mon-Fri 8AM-6PM',
        phone: point.phone || point.contact_number || '',
        distance: point.distance || 0
      }));

      setPoints(transformedPoints);
    } catch (err: any) {
      console.error('Error fetching pickup points:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch points when component mounts or filters change
  useEffect(() => {
    if (isLoaded) {
      fetchPickupPoints(userLocation?.lat, userLocation?.lng);
    }
  }, [isLoaded, userLocation, typeFilter]);

  const handlePointSelect = (point: PickupPoint) => {
    onChange(point);
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Sort points by distance if user location is available
  const sortedPoints = userLocation 
    ? [...points].sort((a, b) => {
        const distA = calculateDistance(userLocation.lat, userLocation.lng, a.lat, a.lng);
        const distB = calculateDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
        return distA - distB;
      })
    : points;

  if (!isLoaded) {
    return (
      <div className={`space-y-3 ${className}`}>
        <label className="block text-sm font-medium text-gray-700">Choose a Pickup Point</label>
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Choose a Pickup Point <span className="text-red-500">*</span>
        </label>
        
        {/* Type Filter */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1 text-sm rounded-full border ${
              typeFilter === 'all' 
                ? 'bg-pink-400 text-white border-pink-400' 
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setTypeFilter('locker')}
            className={`px-3 py-1 text-sm rounded-full border ${
              typeFilter === 'locker' 
                ? 'bg-pink-400 text-white border-pink-400' 
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Lockers
          </button>
          <button
            onClick={() => setTypeFilter('counter')}
            className={`px-3 py-1 text-sm rounded-full border ${
              typeFilter === 'counter' 
                ? 'bg-pink-400 text-white border-pink-400' 
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Kiosks
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="h-64 rounded-lg border border-gray-300 overflow-hidden">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={center}
          zoom={12}
          options={{
            disableDefaultUI: true,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false
          }}
        >
          {sortedPoints.map((point) => (
            <Marker
              key={point.id}
              position={{ lat: point.lat, lng: point.lng }}
              onClick={() => handlePointSelect(point)}
              icon={{
                url: value?.id === point.id 
                  ? 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="16" cy="16" r="12" fill="#ec4899" stroke="#fff" stroke-width="2"/>
                      <circle cx="16" cy="16" r="6" fill="#fff"/>
                    </svg>
                  `)
                  : 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="8" fill="#3b82f6" stroke="#fff" stroke-width="2"/>
                    </svg>
                  `)
              }}
            />
          ))}
        </GoogleMap>
      </div>

      {/* Loading/Error States */}
      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-400 mx-auto"></div>
          <p className="text-sm text-gray-600 mt-2">Loading pickup points...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-4">
          <p className="text-sm text-red-600">Error loading pickup points: {error}</p>
          <button
            onClick={() => fetchPickupPoints(userLocation?.lat, userLocation?.lng)}
            className="mt-2 text-sm text-pink-400 hover:text-pink-500"
          >
            Try again
          </button>
        </div>
      )}

      {/* Points List */}
      {!loading && !error && (
        <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
          {sortedPoints.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">No pickup points found in this area</p>
            </div>
          ) : (
            sortedPoints.map((point) => (
              <button
                key={point.id}
                onClick={() => handlePointSelect(point)}
                className={`w-full text-left p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                  value?.id === point.id ? 'bg-pink-50 border-pink-200' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{point.name}</h4>
                      {value?.id === point.id && (
                        <Check className="h-4 w-4 text-pink-400" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {point.street_address}, {point.local_area}, {point.city}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {point.zone} {point.code}
                    </p>
                    {userLocation && (
                      <p className="text-xs text-blue-600 mt-1">
                        {calculateDistance(userLocation.lat, userLocation.lng, point.lat, point.lng).toFixed(1)} km away
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {point.hours && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{point.hours}</span>
                      </div>
                    )}
                    {point.phone && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Phone className="h-3 w-3" />
                        <span>{point.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Selected Point Details */}
      {value && (
        <div className="rounded-lg border border-pink-200 bg-pink-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-pink-400" />
            <h4 className="font-medium text-gray-900">Selected Pickup Point</h4>
          </div>
          <div className="text-sm">
            <p className="font-medium">{value.name}</p>
            <p className="text-gray-600">
              {value.street_address}, {value.local_area}, {value.city}, {value.zone} {value.code}
            </p>
            {value.hours && (
              <p className="text-gray-500 mt-1">
                <Clock className="h-3 w-3 inline mr-1" />
                {value.hours}
              </p>
            )}
            {value.phone && (
              <p className="text-gray-500">
                <Phone className="h-3 w-3 inline mr-1" />
                {value.phone}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
