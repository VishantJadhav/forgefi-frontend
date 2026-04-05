import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// Exported for use in your verify function
export const ALLOWED_DISTANCE_METERS = 150;

export const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // Earth radius in meters
  const toRadians = (deg: number) => deg * (Math.PI / 180);
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export function useGeolocation(publicKeyBase58: string | undefined) {
  const [gymLocation, setGymLocation] = useState<{lat: number, lng: number} | null>(null);

  // MULTI-WALLET IDENTITY STORAGE
  useEffect(() => {
    if (publicKeyBase58) {
      const storageKey = `forgefi_gym_${publicKeyBase58}`;
      const savedGym = localStorage.getItem(storageKey);
      
      if (savedGym) {
        setGymLocation(JSON.parse(savedGym));
      } else {
        setGymLocation(null); 
      }
    } else {
      setGymLocation(null);
    }
  }, [publicKeyBase58]);

  // THE ORACLE: GEOLOCATION CALIBRATION
  const calibrateGymLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setGymLocation(coords);
        
        if (publicKeyBase58) {
          const storageKey = `forgefi_gym_${publicKeyBase58}`;
          localStorage.setItem(storageKey, JSON.stringify(coords));
        }
        
        toast.success(`Gym location locked! Active Radius: ${ALLOWED_DISTANCE_METERS}m.`);
      },
      (error) => {
        console.error(error);
        toast.error("Failed to get location. Allow permissions in settings.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 } 
    );
  };

  return { gymLocation, calibrateGymLocation };
}