import { useState } from 'react';
import { Pencil, Clock, Save, X } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { buildUtcIsoFromLocalDateAndTime, getLocalTimeHHMMFromIso } from '@/lib/datetime';

interface TimeEntry {
  id: string;
  clock_in: string;
  clock_out: string | null;
  date: string;
  hours_worked: number | null;
  total_paused_minutes: number;
  profiles?: { full_name: string } | null;
  // CAMBIO 1: Añadimos estos campos para que TS los reconozca
  address?: string | null;
  gps_lat?: number | null;
  gps_lng?: number | null;
}

interface EditTimeEntryDialogProps {
  entry: TimeEntry;
  onUpdate: () => void;
}

export const EditTimeEntryDialog = ({ entry, onUpdate }: EditTimeEntryDialogProps) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clockInTime, setClockInTime] = useState(getLocalTimeHHMMFromIso(entry.clock_in));
  const [clockOutTime, setClockOutTime] = useState(getLocalTimeHHMMFromIso(entry.clock_out));

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      // Reset values when opening
      setClockInTime(getLocalTimeHHMMFromIso(entry.clock_in));
      setClockOutTime(getLocalTimeHHMMFromIso(entry.clock_out));
    }
    setOpen(isOpen);
  };

  const calculateHoursWorked = (clockIn: Date, clockOut: Date, pausedMinutes: number): number => {
    const diffMs = clockOut.getTime() - clockIn.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    const workedMinutes = diffMinutes - pausedMinutes;
    return Math.max(0, workedMinutes / 60);
  };

  const handleSave = async () => {
    if (!clockInTime) {
      toast.error('La hora de entrada es obligatoria');
      return;
    }

    setSaving(true);

    try {
      // Convert the LOCAL time the admin types into a UTC instant for storage.
      const entryDate = entry.date;
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
        
        hoursWorked = calculateHoursWorked(clockInDate, clockOutDate, entry.total_paused_minutes || 0);
      }

      const { error } = await supabase
        .from('time_entries')
        .update({
          clock_in: clockInISO,
          clock_out: clockOutISO,
          hours_worked: hoursWorked,
          updated_at: new Date().toISOString(),
          // CAMBIO 2: Forzamos que se guarde la ubicación antigua para que no se borre
          address: entry.address,
          gps_lat: entry.gps_lat,
          gps_lng: entry.gps_lng
        })
        .eq('id', entry.id);

      if (error) {
        console.error('Error updating time entry:', error);
        toast.error('Error al actualizar el registro');
      } else {
        toast.success('Registro actualizado correctamente');
        setOpen(false);
        onUpdate();
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error al actualizar el registro');
    } finally {
      setSaving(false);
    }
  };

  const workerName = entry.profiles?.full_name || 'Trabajador';
  const formattedDate = new Date(entry.date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar horarios">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Editar Registro
          </DialogTitle>
          <DialogDescription>
            Modificar las horas de entrada y salida para <strong>{workerName}</strong> el día <strong>{formattedDate}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
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
          
          {entry.total_paused_minutes > 0 && (
            <p className="text-sm text-muted-foreground">
              Este registro tiene <strong>{entry.total_paused_minutes}</strong> minutos de pausa que se descontarán del total.
            </p>
          )}
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
                Guardar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
