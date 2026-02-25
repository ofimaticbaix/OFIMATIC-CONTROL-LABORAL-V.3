import { useState, useEffect } from 'react';
import { 
  Plus, Pencil, Eye, EyeOff, 
  Loader2, Clock, Users, ShieldCheck 
} from 'lucide-react';
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
  const [visibleCodes, setVisibleCodes] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    dni: '',
    position: '',
    role: 'worker',
    workDayType: 'Estándar',
    dailyHours: '8',
    password: '',
  });

  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: p, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      
      if (profilesError) throw profilesError;

      const { data: c, error: credsError } = await supabase
        .from('worker_credentials')
        .select('*');
      
      if (credsError) throw credsError;

      setProfiles(p || []);
      setWorkerCredentials(c || []);
    } catch (err: any) {
      console.error('Error cargando datos:', err);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: `No se pudieron cargar los datos: ${err.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (profile?: any) => {
    if (profile) {
      const creds = workerCredentials.find(c => c.user_id === profile.id);
      setEditingProfile(profile);
      setFormData({
        fullName: profile.full_name || '',
        dni: profile.dni || '',
        position: profile.position || '',
        role: profile.role || 'worker',
        workDayType: profile.work_day_type || 'Estándar',
        dailyHours: String(profile.daily_hours || '8'),
        password: creds?.access_code || ''
      });
    } else {
      setEditingProfile(null);
      const autoPin = String(Math.floor(1000 + Math.random() * 9000));
      setFormData({
        fullName: '', dni: '', position: '', role: 'worker', 
        workDayType: 'Estándar', dailyHours: '8', password: autoPin
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const cleanDni = formData.dni.trim().toUpperCase();
      const userEmail = `${cleanDni.toLowerCase()}@ofimatic.com`;
      const technicalPassword = `worker_${formData.password}_${cleanDni}`;

      if (!editingProfile) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userEmail,
          password: technicalPassword,
          options: { data: { full_name: formData.fullName, role: formData.role } }
        });

        if (authError) throw new Error(authError.message.includes('already registered') ? 'El DNI ya existe.' : authError.message);

        const userId = authData.user?.id;
        if (!userId) throw new Error("No se obtuvo ID");

        await supabase.rpc('insert_profile_direct', {
          p_id: userId, p_full_name: formData.fullName, p_dni: cleanDni,
          p_position: formData.position || null, p_role: formData.role,
          p_email: userEmail, p_work_day_type: formData.workDayType,
          p_daily_hours: parseFloat(formData.dailyHours), p_is_active: true
        });

        await supabase.rpc('insert_credentials_direct', {
          p_user_id: userId, p_access_code: formData.password
        });

      } else {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.fullName, dni: cleanDni, position: formData.position,
            role: formData.role, work_day_type: formData.workDayType,
            daily_hours: parseFloat(formData.dailyHours)
          })
          .eq('id', editingProfile.id);

        if (profileError) throw profileError;

        await supabase.from('worker_credentials').upsert({ 
          user_id: editingProfile.id, access_code: formData.password 
        }, { onConflict: 'user_id' });
      }

      toast({ title: '✅ Éxito', description: editingProfile ? 'Actualizado' : 'Creado correctamente' });
      await loadData();
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin h-10 w-10 text-blue-500/50" />
        <p className="text-xs font-medium tracking-[0.2em] text-slate-400 uppercase">Sincronizando equipo</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-2 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header Minimalista */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Users className="h-7 w-7 text-blue-500/80" />
            Equipo
          </h2>
          <p className="text-sm text-slate-500 font-medium">Gestión de personal y accesos</p>
        </div>
        <Button 
          onClick={() => handleOpenDialog()} 
          className="rounded-full bg-slate-900 dark:bg-white dark:text-black hover:opacity-90 px-8 h-11 transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-slate-200 dark:shadow-none font-bold uppercase text-[10px] tracking-widest"
        >
          <Plus className="h-4 w-4 mr-2" /> Nuevo Registro
        </Button>
      </div>

      {/* Tabla Glassmorphism */}
      <div className="relative overflow-hidden rounded-[2rem] border border-white/40 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl shadow-2xl shadow-slate-200/50 dark:shadow-none transition-all">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-md">
            <TableRow className="hover:bg-transparent border-b border-slate-100 dark:border-slate-800">
              <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] h-14 pl-8">Miembro</TableHead>
              <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] h-14">Acceso</TableHead>
              <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] h-14 text-center">Jornada</TableHead>
              <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] h-14 text-right pr-8">Gestión</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((p) => {
              const pin = workerCredentials.find(c => c.user_id === p.id)?.access_code || '----';
              return (
                <TableRow key={p.id} className="group border-b border-slate-50 dark:border-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all duration-300">
                  <TableCell className="py-6 pl-8">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-slate-800 dark:text-slate-100 text-[15px] tracking-tight">{p.full_name}</span>
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{p.position || 'Personal'}</span>
                         {p.role === 'admin' && (
                           <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter border border-blue-100 dark:border-blue-800">Admin</span>
                         )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 bg-white/80 dark:bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-700 w-fit group-hover:border-blue-200 transition-all shadow-sm">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm tracking-[0.2em]">
                        {visibleCodes[p.id] ? pin : '••••'}
                      </span>
                      <button onClick={() => setVisibleCodes(prev => ({...prev, [p.id]: !prev[p.id]}))} className="text-slate-300 hover:text-blue-500 transition-colors">
                        {visibleCodes[p.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-tighter border border-slate-200/50 dark:border-slate-700">
                      <Clock className="h-3 w-3" />
                      {p.work_day_type === 'Estándar' ? `${p.daily_hours}h` : 'Personal'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <div className="flex justify-end gap-2 opacity-20 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <MonthlyReportDialog profile={p} />
                      <button onClick={() => handleOpenDialog(p)} className="p-2.5 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                        <Pencil className="h-4 w-4 text-slate-400" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Modal Estilo Apple */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl rounded-[2.5rem] bg-white/80 dark:bg-slate-900/90 backdrop-blur-3xl border-white/40 dark:border-slate-800 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] animate-in zoom-in-95 duration-500">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-semibold tracking-tight text-center">Ficha del Miembro</DialogTitle>
            <div className="flex justify-center">
              <div className="h-1 w-12 bg-blue-500/20 rounded-full" />
            </div>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-8 pt-4">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 px-1">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 ml-1">Nombre Completo</Label>
                  <Input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="rounded-2xl bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 h-12 focus:ring-blue-500/20" />
                </div>
                <div className="space-y-2 px-1">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 ml-1">DNI / NIE</Label>
                  <Input required value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value.toUpperCase()})} className="rounded-2xl bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 h-12 focus:ring-blue-500/20" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-50 dark:border-slate-800 pt-6">
                <div className="space-y-2 px-1">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 ml-1">Cargo / Posición</Label>
                  <Input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="rounded-2xl bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 h-12 focus:ring-blue-500/20" />
                </div>
                <div className="space-y-2 px-1">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 ml-1">Rol de Sistema</Label>
                  <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                    <SelectTrigger className="rounded-2xl bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 border-slate-100 dark:border-slate-700">
                      <SelectItem value="worker" className="rounded-xl">Colaborador</SelectItem>
                      <SelectItem value="admin" className="rounded-xl">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="relative group overflow-hidden rounded-[2rem] p-8 bg-blue-500/[0.03] dark:bg-blue-500/[0.05] border border-blue-500/10 flex flex-col items-center gap-4">
              <div className="absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 bg-blue-500/5 blur-3xl rounded-full" />
              <Label className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-600/60 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Código de Acceso
              </Label>
              <Input 
                required value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                className="bg-transparent border-none text-5xl font-mono font-bold text-center tracking-[0.4em] h-auto p-0 focus-visible:ring-0 text-slate-800 dark:text-white" 
                maxLength={4} pattern="[0-9]{4}" inputMode="numeric"
              />
              <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase italic">Uso exclusivo para terminal de fichaje</p>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-50 dark:border-slate-800 gap-4">
              <Button 
                type="submit" 
                disabled={isSaving} 
                className="w-full rounded-[1.5rem] bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.01] active:scale-[0.98]"
              >
                {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : 'Confirmar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
