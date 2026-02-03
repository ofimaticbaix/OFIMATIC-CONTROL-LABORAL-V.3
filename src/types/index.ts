export type UserRole = 'admin' | 'worker';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  dni: string | null;
  department: string | null;
  position: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: string;
  user_id: string;
  date: string;
  clock_in: string;
  clock_out: string | null;
  work_type: 'office' | 'remote';
  location_lat: number | null;
  location_lng: number | null;
  location_address: string | null;
  hours_worked: number | null;
  is_paused: boolean;
  total_paused_minutes: number;
  pause_started_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  profiles?: Profile;
}

export interface Incident {
  id: string;
  user_id: string;
  type: 'absence' | 'delay' | 'early_departure' | 'other';
  description: string;
  affected_date: string;
  affected_time: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_comment: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  profiles?: Profile;
}

// Legacy types for compatibility during transition
export interface Worker {
  id: string;
  fullName: string;
  dni: string;
  department: string;
  position: string;
  startDate: string;
  isActive: boolean;
  createdAt: string;
}

export interface TimeRecord {
  id: string;
  workerId: string;
  workerName: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  } | null;
  workType: 'presencial' | 'teletrabajo';
  hoursWorked: number | null;
  createdAt: string;
  isImmutable: boolean;
}

export type WorkType = 'presencial' | 'teletrabajo';

export interface AppState {
  currentWorker: Worker | null;
  isCheckedIn: boolean;
  currentRecord: TimeRecord | null;
}
