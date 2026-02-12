import { useState, useEffect } from 'react';
import { 
  Plus, Pencil, Eye, EyeOff, 
  Loader2, Clock
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
      const { data: p } = await supabase.from('profiles').select('*').order('full_name');
      const { data: c } = await supabase.from('worker_credentials').select('*');
      setProfiles(p || []);
      setWorkerCredentials(c || []);
    } catch (err) {
      console.error("Error al cargar datos:", err);
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

      if (editingProfile) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.fullName,
            dni: cleanDni,
            position: formData.position,
            role: formData.role,
            work_day_type: formData.workDayType,
            daily_hours: parseFloat(formData.dailyHours)
          })
          .eq('id', editingProfile.id);

        if (profileError) throw profileError;

        const { error: credError } = await supabase
          .from('worker_credentials')
          .update({ access_code: formData.password })
          .eq('user_id', editingProfile.id);

        if (credError) throw credError;

        toast({ title: 'Actualizado', description: 'Cambios guardados correctamente.' });
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userEmail,
          password: technicalPassword,
          options: { data: { full_name: formData.fullName, role: formData.role } }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("No se recibió respuesta de autenticación.");

        const { error: profileInsertError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          full_name: formData.fullName,
          dni: cleanDni,
          position: formData.position,
          role: formData.role,
          email: userEmail,
          work_day_type: formData.workDayType,
          daily_hours: parseFloat(formData.dailyHours)
        });

        if (profileInsertError) throw profileInsertError;

        const { error: credInsertError } = await supabase.from('worker_credentials').insert({
          user_id: authData.user.id,
          access_code: formData.password
        });

        if (credInsertError) throw credInsertError;

        toast({ title: '¡Éxito!', description: 'Usuario registrado correctamente.' });
      }

      await loadData();
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Error de Guardado', 
        description: err.message || 'Error en la base de datos.' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center gap-4 text-foreground">
      <Loader2 className="animate-spin h-10 w-10 text-primary" />
      <p className="text-xs font-black uppercase tracking-widest opacity-70">Cargando trabajadores...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black uppercase italic text-foreground tracking-tighter">Gestión de Trabajadores</h2>
        <Button onClick={() => handleOpenDialog()} className="bg-primary text-primary-foreground font-bold uppercase text-[10px] px-6 transition-transform hover:scale-105 active:scale-95">
          <Plus className="h-4 w-4 mr-2" /> Nuevo Alta
        </Button>
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] h-12">Nombre</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] h-12">PIN de Acceso</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] h-12">Puesto / Jornada</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] h-12 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((p, index) => {
              // FILTRO ELIMINADO: Ahora el administrador vuelve a aparecer
              const pin = workerCredentials.find(c => c.user_id === p.id)?.access_code || '----';
              return (
                <TableRow key={p.id} className="transition-colors border-b last:border-0 hover:bg-muted/30 animate-in fade-in slide-in-from-left-2" style={{ animationDelay: `${index * 40}ms` }}>
                  <TableCell className="font-bold text-foreground py-5">
                    <div className="flex flex-col">
                      <span>{p.full_name}</span>
                      {p.role === 'admin' && <span className="text-[8px] text-primary font-black uppercase tracking-widest">Admin</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md border w-fit">
                      <span className="font-mono font-bold text-primary text-sm">{visibleCodes[p.id] ? pin : '••••'}</span>
                      <button onClick={() => setVisibleCodes(prev => ({...prev, [p.id]: !prev[p.id]}))} className="text-muted-foreground hover:text-foreground">
                        {visibleCodes[p.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-[10px] font-bold uppercase space-y-0.5 text-foreground">
                      <p className="opacity-80">{p.position || '---'}</p>
                      <p className="text-muted-foreground font-medium">{p.work_day_type === 'Estándar' ? `⏱️ ${p.daily_hours}h diarias` : '📅 Personalizada'}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-3 items-center">
                      <div className="[&_button]:text-black [&_button]:dark:text-white font-bold transition-opacity hover:opacity-70">
                        <MonthlyReportDialog profile={p} />
                      </div>
                      <button onClick={() => handleOpenDialog(p)} className="text-muted-foreground hover:text-foreground p-2 rounded-full transition-all">
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black uppercase italic text-xl tracking-tight text-foreground">Ficha de Personal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Nombre Completo</Label>
                <Input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="bg-muted/30 border-input text-foreground" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">DNI / NIE</Label>
                <Input required value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value.toUpperCase()})} className="bg-muted/30 border-input text-foreground" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Puesto</Label>
                <Input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="bg-muted/30 border-input text-foreground" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Tipo de Cuenta</Label>
                <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                  <SelectTrigger className="bg-muted/30 border-input"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-background border"><SelectItem value="worker">Trabajador</SelectItem><SelectItem value="admin">Administrador</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-5 bg-primary/5 border border-primary/20 rounded-lg">
              <Label className="text-[10px] font-black uppercase text-primary">PIN de Acceso (Editable)</Label>
              <Input required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-transparent border-none text-3xl font-mono font-black tracking-widest p-0 h-auto text-foreground focus-visible:ring-0" maxLength={4} />
            </div>
            <div className="space-y-4 border-t pt-5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Configuración de la Jornada</Label>
              <Select value={formData.workDayType} onValueChange={v => setFormData({...formData, workDayType: v})}>
                <SelectTrigger className="bg-muted/30 border-input"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-background border"><SelectItem value="Estándar">Jornada Estándar (L-V)</SelectItem><SelectItem value="Personalizada">Jornada Personalizada</SelectItem></SelectContent>
              </Select>
              <div className="flex items-center gap-4 bg-muted/20 p-5 rounded-lg border">
                <Clock className="text-primary h-5 w-5" />
                <div className="flex-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Horas diarias estimadas</Label>
                  <Input type="number" step="0.5" value={formData.dailyHours} onChange={e => setFormData({...formData, dailyHours: e.target.value})} className="bg-transparent border-none text-2xl font-black p-0 h-auto text-foreground focus-visible:ring-0" />
                </div>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="submit" disabled={isSaving} className="w-full bg-primary text-primary-foreground font-black uppercase tracking-widest h-12 shadow-lg">
                {isSaving ? <Loader2 className="animate-spin h-5 w-5 text-white" /> : 'Confirmar Alta / Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
