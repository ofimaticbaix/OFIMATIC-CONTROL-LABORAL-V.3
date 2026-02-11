import { useState, useEffect } from 'react';
import { 
  Plus, Pencil, Trash2, UserX, Search, Eye, EyeOff, Save, 
  ShieldAlert, BadgeCheck, Briefcase, Hash, Loader2, Mail, Clock, UserCog
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MonthlyReportDialog } from '../admin/MonthlyReportDialog';

export const WorkersView = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [workerCredentials, setWorkerCredentials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'deactivated'>('active');
  const [visibleCodes, setVisibleCodes] = useState<Record<string, boolean>>({});
  const [isCustomSchedule, setIsCustomSchedule] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    password: '',
    fullName: '',
    dni: '',
    position: '',
    role: 'worker',
    dailyHours: '8',
    work_schedule: {
      monday: { active: true, start: "09:00", end: "17:00", totalHours: 8 },
      tuesday: { active: true, start: "09:00", end: "17:00", totalHours: 8 },
      wednesday: { active: true, start: "09:00", end: "17:00", totalHours: 8 },
      thursday: { active: true, start: "09:00", end: "17:00", totalHours: 8 },
      friday: { active: true, start: "09:00", end: "17:00", totalHours: 8 },
      saturday: { active: false, start: "09:00", end: "15:00", totalHours: 6 },
      sunday: { active: false, start: "09:00", end: "14:00", totalHours: 5 }
    }
  });

  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Consulta directa para asegurar que los datos bajen de Supabase
      const { data: profilesData, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

      const { data: credsData, error: credError } = await supabase
        .from('worker_credentials')
        .select('user_id, access_code');

      if (profError) throw profError;
      
      setProfiles(profilesData || []);
      setWorkerCredentials(credsData || []);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error de carga', description: 'No se pudieron recuperar los trabajadores.' });
    } finally {
      setLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(p => {
    const isActive = activeTab === 'active' ? (p.is_active !== false) : (p.is_active === false);
    const matchesSearch = p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (p.dni && p.dni.toLowerCase().includes(searchTerm.toLowerCase()));
    return isActive && matchesSearch;
  });

  const handleOpenDialog = (profile?: any) => {
    if (profile) {
      setEditingProfile(profile);
      setIsCustomSchedule(!!profile.work_schedule);
      setFormData({
        ...formData,
        fullName: profile.full_name || '',
        dni: profile.dni || '',
        position: profile.position || '',
        role: profile.role || 'worker',
        dailyHours: profile.daily_hours ? String(profile.daily_hours) : '8',
        work_schedule: profile.work_schedule || formData.work_schedule
      });
    } else {
      setEditingProfile(null);
      setIsCustomSchedule(false);
      setFormData({
        ...formData,
        password: String(Math.floor(1000 + Math.random() * 9000)),
        fullName: '',
        dni: '',
        position: '',
        role: 'worker',
        dailyHours: '8'
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const finalSchedule = isCustomSchedule ? formData.work_schedule : null;

    try {
      if (editingProfile) {
        const { error } = await supabase.from('profiles').update({
          full_name: formData.fullName,
          dni: formData.dni,
          position: formData.position,
          role: formData.role,
          daily_hours: parseFloat(formData.dailyHours) || 8,
          work_schedule: finalSchedule
        }).eq('id', editingProfile.id);
        if (error) throw error;
        toast({ title: 'Perfil actualizado' });
      } else {
        // Lógica de nuevo usuario
        const internalEmail = `${formData.dni.toLowerCase()}@ofimatic.com`;
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: internalEmail,
          password: `worker_${formData.password}_${formData.dni}`,
          options: { data: { full_name: formData.fullName, role: formData.role } }
        });
        if (signUpError) throw signUpError;
        if (data.user) {
          await supabase.from('profiles').update({ 
            dni: formData.dni, position: formData.position, role: formData.role,
            daily_hours: parseFloat(formData.dailyHours) || 8, work_schedule: finalSchedule 
          }).eq('id', data.user.id);
          await supabase.from('worker_credentials').insert({ user_id: data.user.id, access_code: formData.password });
        }
        toast({ title: 'Trabajador creado' });
      }
      loadData();
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    await supabase.from('profiles').update({ is_active: false }).eq('id', id);
    loadData();
    toast({ title: 'Trabajador dado de baja' });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 className="animate-spin h-10 w-10 text-blue-500" />
      <p className="text-slate-500 font-bold uppercase text-xs tracking-widest italic">Cargando Plantilla...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-white italic">Plantilla</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Gestión de Personal y Horarios</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-slate-900 border-slate-800 text-white pl-10" />
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700 font-black uppercase text-xs tracking-widest h-10">
            <Plus className="h-4 w-4 mr-2" /> Nuevo Alta
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v:any) => setActiveTab(v)}>
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="active" className="text-xs font-bold uppercase px-8">Personal Activo ({profiles.filter(p => p.is_active !== false).length})</TabsTrigger>
          <TabsTrigger value="deactivated" className="text-xs font-bold uppercase px-8">Bajas</TabsTrigger>
        </TabsList>

        <Card className="bg-slate-900 border-slate-800 mt-4 overflow-hidden shadow-2xl">
          <Table>
            <TableHeader className="bg-slate-950">
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-500 font-black uppercase text-[10px] p-4">Trabajador</TableHead>
                <TableHead className="text-slate-500 font-black uppercase text-[10px] p-4">Puesto / Rol</TableHead>
                <TableHead className="text-slate-500 font-black uppercase text-[10px] p-4 text-center">PIN Fichaje</TableHead>
                <TableHead className="text-slate-500 font-black uppercase text-[10px] p-4 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProfiles.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-500 italic uppercase text-xs">No hay datos disponibles</TableCell></TableRow>
              ) : filteredProfiles.map(p => (
                <TableRow key={p.id} className="border-slate-800 hover:bg-slate-800/40 transition-colors">
                  <TableCell className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-100 flex items-center gap-2">
                        {p.full_name}
                        {p.role === 'admin' && <ShieldAlert className="h-3 w-3 text-amber-500" />}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{p.dni || '---'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="p-4">
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="text-[9px] font-bold border-slate-700 text-slate-300 w-fit">{p.position || '---'}</Badge>
                      <Badge className={`${p.role === 'admin' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800 text-slate-500'} text-[9px] font-black w-fit uppercase`}>{p.role}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="p-4 text-center">
                    <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 inline-block font-mono font-black text-blue-400">
                      {visibleCodes[p.id] ? (workerCredentials.find(c => c.user_id === p.id)?.access_code || '****') : '****'}
                      <Button variant="ghost" size="icon" className="h-4 w-4 ml-2" onClick={() => setVisibleCodes(prev => ({...prev, [p.id]: !prev[p.id]}))}>
                         {visibleCodes[p.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(p)} className="text-blue-500"><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-red-500"><UserX className="h-4 w-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-950 border-slate-800 text-white">
                          <AlertDialogHeader><AlertDialogTitle>Confirmar Baja</AlertDialogTitle><AlertDialogDescription>¿Desactivar a {p.full_name}?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-900">No</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeactivate(p.id)} className="bg-red-600">Sí, dar de baja</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </Tabs>

      {/* MODAL DE EDICIÓN / ALTA (RESTAURADO) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl bg-slate-950 text-white border-slate-800">
          <DialogHeader className="border-b border-slate-900 pb-4 mb-4">
            <DialogTitle className="uppercase font-black text-xl tracking-tighter flex items-center gap-2">
              <UserCog className="text-blue-500 h-5 w-5" /> Ficha de Personal
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-slate-500">Nombre</Label><Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="bg-slate-900 border-slate-800" /></div>
              <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-slate-500">DNI</Label><Input value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value.toUpperCase()})} className="bg-slate-900 border-slate-800" disabled={!!editingProfile} /></div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-slate-500">Cargo</Label><Input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="bg-slate-900 border-slate-800" /></div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Rol</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                  <SelectTrigger className="bg-slate-900 border-slate-800"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white"><SelectItem value="worker">Trabajador</SelectItem><SelectItem value="admin">Administrador</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={isSaving} className="w-full bg-blue-600 font-black uppercase">
              {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4 mr-2" />} Guardar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
