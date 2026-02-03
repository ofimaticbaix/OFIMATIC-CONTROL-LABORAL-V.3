import { useState, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  loading: boolean;
  error: string | null;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    address: null,
    loading: false,
    error: null,
  });

  const getLocation = useCallback(async (): Promise<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null> => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocalización no soportada' }));
      return null;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Validate coordinate ranges to prevent injection
          const isValidCoordinate = (lat: number, lon: number): boolean => {
            return (
              typeof lat === 'number' &&
              typeof lon === 'number' &&
              !isNaN(lat) &&
              !isNaN(lon) &&
              lat >= -90 &&
              lat <= 90 &&
              lon >= -180 &&
              lon <= 180
            );
          };
          
          // Try to get address from coordinates (reverse geocoding)
          let address: string | undefined;
          try {
            if (!isValidCoordinate(latitude, longitude)) {
              console.error('Invalid coordinates received from geolocation');
            } else {
              // Use URLSearchParams for safe URL construction
              const params = new URLSearchParams({
                format: 'json',
                lat: latitude.toString(),
                lon: longitude.toString(),
                zoom: '18',
                addressdetails: '1'
              });
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?${params.toString()}`
              );
              const data = await response.json();
              address = data.display_name;
            }
          } catch (e) {
            console.log('Could not get address:', e);
          }

          setState({
            latitude,
            longitude,
            address: address || null,
            loading: false,
            error: null,
          });

          resolve({ latitude, longitude, address });
        },
        (error) => {
          let errorMessage = 'Error al obtener ubicación';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permiso de ubicación denegado';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Ubicación no disponible';
              break;
            case error.TIMEOUT:
              errorMessage = 'Tiempo de espera agotado';
              break;
          }
          setState({
            latitude: null,
            longitude: null,
            address: null,
            loading: false,
            error: errorMessage,
          });
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  return { ...state, getLocation };
};
