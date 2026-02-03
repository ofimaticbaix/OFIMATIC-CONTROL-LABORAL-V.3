import { useState } from 'react';
import { Plus, Clock, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Profile } from '@/types';
import { buildUtcIsoFromLocalDateAndTime } from '@/lib/datetime';

interface CreateManualEntryDialogProps {
  profiles: Profile[];
  onCreated: () => void;
}

export const CreateManualEntryDialog = ({ profiles, onCreated }: CreateManualEntryDialogProps) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [selectedWorker, setSelectedWorker] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [clockInTime, setClockInTime] = useState('');
  const [clockOutTime, setClockOutTime] = useState('');
  const [workType, setWorkType] = useState<'office' | 'remote'>('office');

  const activeWorkers = profiles.filter(p => p.role === 'worker' && p.is_active);

  const resetForm = () => {
    setSelectedWorker('');
    setEntryDate('');
    setClockInTime('');
    setClockOutTime('');
    setWorkType('office');
  };

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      resetForm();
      // Set default date to today
      setEntryDate(new Date().toISOString().split('T')[0]);
    }
    setOpen(isOpen);
  };

  const calculateHoursWorked = (clockIn: Date, clockOut: Date): number => {
    const diffMs = clockOut.getTime() - clockIn.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    return Math.max(0, diffMinutes / 60);
  };

  const handleSave = async () => {
    if (!selectedWorker) {
      toast.error('Selecciona un trabajador');
      return;
    }
    if (!entryDate) {
      toast.error('Selecciona una fecha');
      return;
    }
    if (!clockInTime) {
      toast.error('La hora de entrada es obligatoria');
      return;
    }

    setSaving(true);

    try {
      // Convert the LOCAL time the admin types into a UTC instant for storage.
      const clockInISO = buildUtcIsoFromLocalDateAndTime(entryDate, clockInTime);
      const clockOutISO = clockOutTime ? buildUtcIsoFromLocalDateAndTime(entryDate, clockOutTime) : null;

      // Calculate hours worked if both times exist
      let hoursWorked: number | null = null;
      if (clockOutISO) {
        const clockInDate = new Date(clockInISO);
        const clockOutDate = new Date(clockOutISO);
        
        if (clockOutDate <= clockInDate) {
          toast.error('La hora de salida debe ser posterior a la de entrada');
          setSaving(false);
          return;
        }
        
        hoursWorked = calculateHoursWorked(clockInDate, clockOutDate);
      }

      const { error } = await supabase
        .from('time_entries')
        .insert({
          user_id: selectedWorker,
          date: entryDate,
          clock_in: clockInISO,
          clock_out: clockOutISO,
          hours_worked: hoursWorked,
          work_type: workType,
          total_paused_minutes: 0,
          is_paused: false,
        });

      if (error) {
        console.error('Error creating time entry:', error);
        toast.error('Error al crear el registro');
      } else {
        toast.success('Registro creado correctamente');
        setOpen(false);
        onCreated();
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error al crear el registro');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Añadir Fichaje Manual
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Crear Fichaje Manual
          </DialogTitle>
          <DialogDescription>
            Añadir un registro de jornada para un trabajador que olvidó fichar.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Worker selection */}
          <div className="space-y-2">
            <Label htmlFor="worker">Trabajador</Label>
            <Select value={selectedWorker} onValueChange={setSelectedWorker}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un trabajador" />
              </SelectTrigger>
              <SelectContent>
                {activeWorkers.map((worker) => (
                  <SelectItem key={worker.id} value={worker.id}>
                    {worker.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="entry-date">Fecha</Label>
            <Input
              id="entry-date"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
          </div>

          {/* Work type */}
          <div className="space-y-2">
            <Label>Tipo de Trabajo</Label>
            <Select value={workType} onValueChange={(v) => setWorkType(v as 'office' | 'remote')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="office">Presencial</SelectItem>
                <SelectItem value="remote">Teletrabajo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Time inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clock-in">Hora de Entrada</Label>
              <Input
                id="clock-in"
                type="time"
                value={clockInTime}
                onChange={(e) => setClockInTime(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clock-out">Hora de Salida</Label>
              <Input
                id="clock-out"
                type="time"
                value={clockOutTime}
                onChange={(e) => setClockOutTime(e.target.value)}
                className="font-mono"
                placeholder="--:--"
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            La hora de salida es opcional si el trabajador aún no ha terminado su jornada.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Crear Registro
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
