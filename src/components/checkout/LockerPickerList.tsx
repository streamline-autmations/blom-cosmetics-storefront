import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Phone, Check, Search, Navigation } from 'lucide-react';

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

interface LockerPickerListProps {
  value: PickupPoint | null;
  onChange: (point: PickupPoint) => void;
  className?: string;
}

// Haversine distance calculation
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export const LockerPickerList: React.FC<LockerPickerListProps> = ({
  value,
  onChange,
  className = ''
}) => {
  // Safely coerce ShipLogic fields to readable strings
  const toStringSafe = (input: any): string => {
    if (input == null) return '';
    if (typeof input === 'string') return input;
    if (typeof input === 'number') return String(input);
    if (typeof input === 'object') {
      const candidates = [
        input.line1,
        input.address1,
        input.address,
        input.street,
        input.road,
        input.name,
        input.description,
        input.label,
      ].filter((v: any) => typeof v === 'string' && v.trim().length > 0);
      if (candidates.length) return candidates.join(' ');
      // Don't expose raw JSON strings; return empty when unknown
      return '';
    }
    return '';
  };

  // Build a short, human-readable line for a pickup point
  const formatAddressLine = (p: PickupPoint & { entered_address?: string }): string => {
    // Prefer explicit entered_address if it looks like a street
    const entered = toStringSafe((p as any).entered_address);
    if (entered && /\d/.test(entered)) return entered;
    const line = [p.street_address, p.local_area, p.city].filter(Boolean).join(', ');
    return line || [p.city, p.zone].filter(Boolean).join(', ');
  };
  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'locker' | 'counter'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Get user's current location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(userPos);
        },
        (error) => {
          console.warn('Geolocation error:', error);
          // Continue without location - will use search fallback
        },
        {
          timeout: 10000,
          enableHighAccuracy: false
        }
      );
    }
  }, []);

  // Fallback pickup points data for when API fails
  const getFallbackPickupPoints = (): PickupPoint[] => [
    {
      id: 'fallback_1',
      name: 'Cape Town CBD Pickup Point',
      street_address: '123 Long Street',
      local_area: 'Cape Town CBD',
      city: 'Cape Town',
      zone: 'Western Cape',
      code: '8001',
      country: 'ZA',
      lat: -33.9249,
      lng: 18.4241,
      provider: 'tcg-locker',
      hours: 'Mon-Fri 8AM-6PM, Sat 9AM-2PM',
      phone: '021 123 4567'
    },
    {
      id: 'fallback_2',
      name: 'Sandton City Pickup Point',
      street_address: 'Sandton City Shopping Centre',
      local_area: 'Sandton',
      city: 'Johannesburg',
      zone: 'Gauteng',
      code: '2196',
      country: 'ZA',
      lat: -26.1076,
      lng: 28.0567,
      provider: 'tcg-locker',
      hours: 'Mon-Sun 8AM-8PM',
      phone: '011 234 5678'
    },
    {
      id: 'fallback_3',
      name: 'Durban CBD Pickup Point',
      street_address: '456 West Street',
      local_area: 'Durban CBD',
      city: 'Durban',
      zone: 'KwaZulu-Natal',
      code: '4001',
      country: 'ZA',
      lat: -29.8587,
      lng: 31.0218,
      provider: 'tcg-locker',
      hours: 'Mon-Fri 8AM-5PM',
      phone: '031 345 6789'
    }
  ];

  // Fetch pickup points from ShipLogic via our proxy
  const fetchPickupPoints = async (search?: string, lat?: number, lng?: number) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      // If we have user location, use it for nearest results
      if (lat && lng) {
        params.append('lat', lat.toString());
        params.append('lng', lng.toString());
        params.append('order_closest', 'true');
      }
      
      // Apply type filter
      if (typeFilter !== 'all') {
        params.append('type', typeFilter === 'locker' ? 'locker' : 'counter');
      }
      
      // Apply search query if provided
      if (search && search.trim()) {
        params.append('search', search.trim());
      }

      const response = await fetch(`/.netlify/functions/pickup-points?${params.toString()}`);
      
      if (!response.ok) {
        console.warn('API failed, using fallback data');
        const fallbackPoints = getFallbackPickupPoints();
        setPoints(fallbackPoints);
        return;
      }

      const data = await response.json();
    
    // FIX: Ensure data is an array
    let pointsArray = [];
    if (Array.isArray(data)) {
      pointsArray = data;
    } else if (data && Array.isArray(data.data)) {
      pointsArray = data.data;
    } else if (data && Array.isArray(data.pickup_points)) {
      pointsArray = data.pickup_points;
    } else if (data && Array.isArray(data.results)) {
      pointsArray = data.results;
    } else {
      console.warn('Unexpected API response format:', data);
      pointsArray = [];
    }
    
    // If no results but we have a search term and not lat/lng, try geocoding the search
    if (pointsArray.length === 0 && search && (!lat || !lng)) {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=za&q=${encodeURIComponent(
            search
          )}`,
          { headers: { 'Accept-Language': 'en' } }
        );
        if (geoRes.ok) {
          const geo = await geoRes.json();
          if (Array.isArray(geo) && geo[0]?.lat && geo[0]?.lon) {
            const geoLat = parseFloat(geo[0].lat);
            const geoLng = parseFloat(geo[0].lon);
            // Re-fetch using derived lat/lng
            await fetchPickupPoints(undefined, geoLat, geoLng);
            return;
          }
        }
      } catch (e) {
        console.warn('Geocoding fallback failed:', e);
      }
    }

    // Transform ShipLogic data to our format
    const transformedPoints: PickupPoint[] = pointsArray.map((point: any) => ({
        id: String(point.id || point.code || point.pickup_point_id || `point_${Math.random()}`),
        name: toStringSafe(point.name || point.title || 'Pickup Point'),
        street_address: toStringSafe(point.street_address || point.address || point.street || ''),
        local_area: toStringSafe(point.local_area || point.suburb),
        city: toStringSafe(point.city),
        zone: toStringSafe(point.zone || point.province),
        code: toStringSafe(point.code || point.postal_code),
        country: toStringSafe(point.country || 'ZA'),
        lat: parseFloat(point.lat ?? point.latitude ?? 0),
        lng: parseFloat(point.lng ?? point.longitude ?? 0),
        provider: toStringSafe(point.provider || 'tcg-locker'),
        hours: toStringSafe(point.hours || point.opening_hours || ''),
        phone: toStringSafe(point.phone || point.contact_number || '')
      }));

      // Calculate distances if user location is available
      const pointsWithDistance = userLocation 
        ? transformedPoints.map(point => ({
            ...point,
            distance: calculateDistance(userLocation.lat, userLocation.lng, point.lat, point.lng)
          }))
        : transformedPoints;

      // Sort by distance if available, otherwise by name
      const sortedPoints = pointsWithDistance.sort((a, b) => {
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        return a.name.localeCompare(b.name);
      });

      setPoints(sortedPoints);
    } catch (err: any) {
      console.error('Error fetching pickup points:', err);
      console.warn('Using fallback data due to error');
      const fallbackPoints = getFallbackPickupPoints();
      setPoints(fallbackPoints);
      setError(null); // Don't show error, just use fallback
    } finally {
      setLoading(false);
    }
  };

  // Fetch points when component mounts or filters change
  useEffect(() => {
    fetchPickupPoints(searchQuery, userLocation?.lat, userLocation?.lng);
  }, [userLocation, typeFilter, searchQuery]);

  const handlePointSelect = (point: PickupPoint) => {
    onChange(point);
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchPickupPoints(searchQuery, userLocation?.lat, userLocation?.lng);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Choose a Pickup Point <span className="text-red-500">*</span>
        </label>
        
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search suburb, mall, city, or area name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                // Auto-search as user types (debounced)
                const timeoutId = setTimeout(() => {
                  if (e.target.value.trim().length >= 2) {
                    fetchPickupPoints(e.target.value, userLocation?.lat, userLocation?.lng);
                  }
                }, 500);
                return () => clearTimeout(timeoutId);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  fetchPickupPoints('', userLocation?.lat, userLocation?.lng);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </form>
        
        {/* Type Filter */}
        <div className="flex gap-2 mb-3">
          <button
            type="button"
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
            type="button"
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
            type="button"
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

        {/* Location Status */}
        {userLocation ? (
          <div className="flex items-center gap-2 text-xs text-green-600 mb-3">
            <Navigation className="h-3 w-3" />
            <span>Showing nearest to your location</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
            <MapPin className="h-3 w-3" />
            <span>Use search to find pickup points near you</span>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-400 mx-auto"></div>
          <p className="text-sm text-gray-600 mt-2">Loading pickup points...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-8">
          <p className="text-sm text-red-600 mb-2">Error loading pickup points: {error}</p>
          <button
            type="button"
            onClick={() => fetchPickupPoints(searchQuery, userLocation?.lat, userLocation?.lng)}
            className="text-sm text-pink-400 hover:text-pink-500 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Points List */}
      {!loading && !error && (
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
          {points.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-medium mb-1">No pickup points found</p>
              <p className="text-xs">Try searching for a different area or city</p>
            </div>
          ) : (
            points.map((point) => (
              <button
                key={point.id}
                type="button"
                onClick={() => handlePointSelect(point)}
                className={`w-full text-left p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                  value?.id === point.id ? 'bg-pink-50 border-pink-200' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{point.name || formatAddressLine(point as any)}</h4>
                      {value?.id === point.id && (
                        <Check className="h-4 w-4 text-pink-400" />
                      )}
                    </div>
                    {formatAddressLine(point as any) && (
                      <p className="text-sm text-gray-600 mt-1">
                        {formatAddressLine(point as any)}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {[point.zone, point.code].filter(Boolean).join(' ')}
                    </p>
                    {point.distance !== undefined && (
                      <p className="text-xs text-blue-600 mt-1 font-medium">
                        {point.distance.toFixed(1)} km away
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
              {formatAddressLine(value as any)}
            </p>
            {value.distance !== undefined && (
              <p className="text-xs text-blue-600 mt-1 font-medium">
                {value.distance.toFixed(1)} km away
              </p>
            )}
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
