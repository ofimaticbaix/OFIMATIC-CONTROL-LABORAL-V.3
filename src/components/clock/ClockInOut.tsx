import { useState, useEffect, useMemo } from 'react';
import { MapPin, CheckCircle2, LogIn, LogOut, Building2, Home, Pause, Play, Search, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Profile, TimeEntry } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { IncidentKanban } from './IncidentKanban';

interface ClockInOutProps { profile: Profile; onRecordCreated: () => void; }
interface TimeEntryWithProfile extends TimeEntry {
  profiles: { full_name: string; is_active?: boolean } | null;
  address?: string | null;
  gps_lat?: number | null;
  gps_lng?: number | null;
  location_address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
}
type WorkType = 'office' | 'remote';
const NON_PAUSING_INCIDENTS = ['meeting'];
const MAX_WORK_HOURS = 10;

// --- 📍 CONFIGURACIÓN OFICIAL OFIMATIC BAIX, S.L. ---
const OFFICE_COORDS = { lat: 41.3580319, lng: 2.0728922, name: "OFIMATIC BAIX, S.L. (Sede Central)" };
const MAX_DISTANCE_KM = 0.15; 

const getBarcelonaDate = () => { try { return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' }); } catch (e) { return new Date().toISOString().split('T')[0]; } };
const formatDecimalHours = (decimal: number) => {
  if (!decimal) return '0h 00m';
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
};

const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const fetchAddressFromCoords = async (lat: number, lng: number): Promise<string | null> => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, { headers: { 'User-Agent': 'OfimaticControl/1.0' } });
    const data = await response.json();
    if (data && data.address) {
        const street = data.address.road || '';
        const number = data.address.house_number || '';
        const city = data.address.city || data.address.town || 'Cornellà';
        return `${street} ${number}, ${city}`.trim();
    }
    return null;
  } catch (error) { return null; }
};

export const ClockInOut = ({ profile, onRecordCreated }: ClockInOutProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentDateStr, setCurrentDateStr] = useState(getBarcelonaDate());
  const [todayEntry, setTodayEntry] = useState<TimeEntry | null>(null);
  const [workType, setWorkType] = useState<WorkType>('office');
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastAction, setLastAction] = useState<'in' | 'out' | 'pause' | 'resume' | null>(null);
  const [loading, setLoading] = useState(true); 
  const [clockingLoading, setClockingLoading] = useState(false);
  const [pauseLoading, setPauseLoading] = useState(false);
  const { toast } = useToast();
  const [adminEntries, setAdminEntries] = useState<TimeEntryWithProfile[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => { setCurrentTime(new Date()); const checkDate = getBarcelonaDate(); if (checkDate !== currentDateStr) setCurrentDateStr(checkDate); }, 1000);
    return () => clearInterval(interval);
  }, [currentDateStr]);

  useEffect(() => { loadActiveSession(); }, [profile.id]);
  useEffect(() => { if (profile.role === 'admin') loadAdminData(); }, [profile.role, lastAction]);

  const loadAdminData = async () =>
