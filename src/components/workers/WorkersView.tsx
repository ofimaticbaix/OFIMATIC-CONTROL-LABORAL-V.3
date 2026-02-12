import { useState, useEffect } from 'react';
import { Plus, Pencil, UserX, Search, Eye, EyeOff, Save, Loader2, Clock, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MonthlyReportDialog } from '../admin/MonthlyReportDialog';

export const WorkersView = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [workerCredentials, setWorkerCredentials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    dni: '',
    position: '',
    role: 'worker',
    workDayType: 'Estándar', // 'Estándar' o 'Personalizada'
    dailyHours: '8',         // Para Jornada Estándar
    schedule: {              // Para Jornada Personalizada
      monday: { from: '09:00', to: '18:00', active: true },
      tuesday: { from: '09:00', to: '18:00', active: true },
      wednesday: { from: '09:00', to: '18:00', active: true },
      thursday: { from: '09:00', to: '18:00', active: true },
      friday: { from: '09:00', to: '14:00', active: true },
    },
    password: ''
  });

  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: p } = await supabase.from('profiles').select('*').order('full_name');
    const { data: c } = await supabase.from('worker_credentials').select('*');
    setProfiles(p || []);
    setWorkerCredentials(c || []);
    setLoading(false);
  };

  const handleOpenDialog = (profile?: any) => {
    if (profile) {
      setEditingProfile(profile);
      setFormData({
        ...formData,
        fullName: profile.full_name || '',
        dni: profile.dni || '',
        position: profile.position || '',
        role: profile.role || 'worker',
        workDayType: profile.work_day_type || 'Estándar',
        dailyHours: String(profile.daily_hours || '8'),
        password: ''
      });
    } else {
      setEditingProfile(null);
      // GENERACIÓN AUTOMÁTICA DE PIN DE 4 DÍGITOS
      const autoPin = String(Math.floor(1000 + Math.random() * 9000));
      setFormData({
        fullName: '', dni: '', position: '', role: 'worker', 
        workDayType: 'Estándar', dailyHours: '8', password: autoPin,
        schedule: formData.schedule
      });
    }
    setIsDialogOpen(true);
  };

  const days = [
    { id: 'monday', label: 'Lunes' },
    { id: 'tuesday', label: 'Martes' },
    { id: 'wednesday', label: 'Miércoles' },
    { id: 'thursday', label: 'Jueves' },
    { id: 'friday', label: 'Viernes' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Plantilla</h2>
        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700 font-bold uppercase text-[10px] px-8">
          <Plus className="h-4 w-4 mr-2" /> Nuevo Alta
        </Button>
      </div>

      <Table>
        <TableHeader className="border-b border-slate-800">
          <TableRow>
            <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Nombre</TableHead>
            <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Puesto / Tipo</TableHead>
            <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Jornada</TableHead>
            <TableHead className="text-slate-500 font-bold uppercase text-[10px] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles.map(p => (
            <TableRow key={p.id} className="border-slate-800 hover:bg-slate-800/20 group">
              <TableCell className="font-bold text-white py-4">{p.full_name}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-300 font-bold uppercase">{p.position || '---'}</span>
                  <span className={`text-[9px] font-black uppercase ${p.role === 'admin' ? 'text-amber-500' : 'text-blue-400'}`}>
                    {p.role === 'admin' ? 'Administrador' : 'Trabajador'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-[10px] font-bold bg-slate-800 px-2 py-1 rounded text-slate-400">
                  {p.work_day_type === 'Personalizada' ? '📅 Horario Semanal' : `⏱️ ${p.daily_hours}h/día`}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <MonthlyReportDialog profile={p} />
                   <button onClick={() => handleOpenDialog(p)} className="p-2 hover:bg-slate-700 rounded text-slate-400"><Pencil className="h-4 w-4" /></button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl bg-slate-950 text-white border-slate-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-black uppercase italic text-xl">Ficha de Alta</DialogTitle></DialogHeader>
          <form className="space-y-6 pt-4">
            
            {/* 1. DATOS BÁSICOS */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Nombre Completo</Label>
                <Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="bg-[#111] border-slate-800" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-500">DNI / NIE</Label>
                <Input value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value.toUpperCase()})} className="bg-[#111] border-slate-800" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Puesto de Trabajo</Label>
                <Input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="bg-[#111] border-slate-800" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Tipo de Cuenta</Label>
                <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                  <SelectTrigger className="bg-[#111] border-slate-800"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="worker">Trabajador</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 2. PIN AUTOMÁTICO (Solo si es trabajador) */}
            {formData.role === 'worker' && !editingProfile && (
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-md">
                <Label className="text-[10px] font-black uppercase text-blue-400">PIN de Acceso Auto-generado</Label>
                <p className="text-2xl font-mono font-black tracking-widest text-white mt-1">{formData.password}</p>
              </div>
            )}

            {/* 3. CONFIGURACIÓN DE JORNADA */}
            <div className="space-y-4 border-t border-slate-900 pt-4">
              <Label className="text-[10px] font-black uppercase text-slate-500">Configuración de la Jornada</Label>
              <Select value={formData.workDayType} onValueChange={v => setFormData({...formData, workDayType: v})}>
                <SelectTrigger className="bg-[#111] border-slate-800"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white font-bold text-xs uppercase">
                  <SelectItem value="Estándar">Jornada Estándar (Horas fijas L-V)</SelectItem>
                  <SelectItem value="Personalizada">Jornada Personalizada (Horario por día)</SelectItem>
                </SelectContent>
              </Select>

              {/* VISTA JORNADA ESTÁNDAR */}
              {formData.workDayType === 'Estándar' && (
                <div className="flex items-center gap-4 bg-[#111] p-4 rounded-md border border-slate-800 animate-in fade-in zoom-in duration-200">
                  <Clock className="text-blue-500 h-5 w-5" />
                  <div className="flex-1">
                    <Label className="text-[10px] font-bold uppercase text-slate-500">Horas diarias (Lunes a Viernes)</Label>
                    <Input type="number" value={formData.dailyHours} onChange={e => setFormData({...formData, dailyHours: e.target.value})} className="bg-transparent border-none text-xl font-black p-0 h-auto" />
                  </div>
                </div>
              )}

              {/* VISTA JORNADA PERSONALIZADA */}
              {formData.workDayType === 'Personalizada' && (
                <div className="space-y-3 bg-[#111] p-4 rounded-md border border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
                  {days.map((day) => (
                    <div key={day.id} className="flex items-center justify-between gap-4 border-b border-slate-800/50 pb-2 last:border-0">
                      <span className="text-[10px] font-black uppercase text-slate-400 w-16">{day.label}</span>
                      <div className="flex items-center gap-2">
                         <Input type="time" className="bg-slate-900 border-slate-800 h-8 text-[10px] font-bold" defaultValue="09:00" />
                         <span className="text-slate-600 text-[10px] font-bold">a</span>
                         <Input type="time" className="bg-slate-900 border-slate-800 h-8 text-[10px] font-bold" defaultValue="18:00" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button className="w-full bg-blue-600 font-black uppercase tracking-widest h-12">Guardar Alta</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
