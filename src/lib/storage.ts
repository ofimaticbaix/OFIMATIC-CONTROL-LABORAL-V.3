import { Worker, TimeRecord, Incident } from '@/types';

const WORKERS_KEY = 'presencia_workers';
const RECORDS_KEY = 'presencia_records';
const INCIDENTS_KEY = 'presencia_incidents';
const CURRENT_WORKER_KEY = 'presencia_current_worker';

// Workers
export const getWorkers = (): Worker[] => {
  const data = localStorage.getItem(WORKERS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveWorker = (worker: Worker): void => {
  const workers = getWorkers();
  const index = workers.findIndex(w => w.id === worker.id);
  if (index >= 0) {
    workers[index] = worker;
  } else {
    workers.push(worker);
  }
  localStorage.setItem(WORKERS_KEY, JSON.stringify(workers));
};

export const deleteWorker = (id: string): void => {
  const workers = getWorkers().filter(w => w.id !== id);
  localStorage.setItem(WORKERS_KEY, JSON.stringify(workers));
};

// Time Records
export const getRecords = (): TimeRecord[] => {
  const data = localStorage.getItem(RECORDS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveRecord = (record: TimeRecord): void => {
  const records = getRecords();
  const index = records.findIndex(r => r.id === record.id);
  if (index >= 0) {
    records[index] = record;
  } else {
    records.push(record);
  }
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
};

export const getRecordsByWorker = (workerId: string): TimeRecord[] => {
  return getRecords().filter(r => r.workerId === workerId);
};

export const getTodayRecord = (workerId: string): TimeRecord | null => {
  const today = new Date().toISOString().split('T')[0];
  return getRecords().find(r => r.workerId === workerId && r.date === today) || null;
};

// Incidents
export const getIncidents = (): Incident[] => {
  const data = localStorage.getItem(INCIDENTS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveIncident = (incident: Incident): void => {
  const incidents = getIncidents();
  incidents.push(incident);
  localStorage.setItem(INCIDENTS_KEY, JSON.stringify(incidents));
};

// Legacy function - kept for compatibility
export const getIncidentsByWorker = (workerId: string): Incident[] => {
  return getIncidents().filter(i => (i as any).workerId === workerId);
};

// Current Worker Session
export const getCurrentWorker = (): Worker | null => {
  const data = localStorage.getItem(CURRENT_WORKER_KEY);
  return data ? JSON.parse(data) : null;
};

export const setCurrentWorker = (worker: Worker | null): void => {
  if (worker) {
    localStorage.setItem(CURRENT_WORKER_KEY, JSON.stringify(worker));
  } else {
    localStorage.removeItem(CURRENT_WORKER_KEY);
  }
};

// Utility functions
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const formatTime = (isoString: string): string => {
  return new Date(isoString).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const formatDate = (isoString: string): string => {
  return new Date(isoString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const calculateHoursWorked = (checkIn: string, checkOut: string): number => {
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  const hours = (end - start) / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
};
