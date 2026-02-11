import { useState, useEffect } from 'react';
import { 
  Plus, Pencil, UserX, Search, Eye, EyeOff, Save, 
  Loader2, UserCog, Briefcase
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'deactivated'>('active');
  const [visibleCodes, setVisibleCodes] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    dni: '',
    position: '',
    role: 'worker',
    workDayType: '8h',
    dailyHours: '8',
    password: ''
  });

  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: profilesData, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

      const { data: credsData } = await supabase.from('worker_credentials').select('*');

      if (profError) throw profError;
      setProfiles(profilesData || []);
      setWorkerCredentials(credsData || []);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error de carga', description: 'No se pudieron recuperar los datos.' });
    } finally {
      setLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(p => {
    const isActive = activeTab === 'active' ? (p.is_active !== false) : (p.is_active === false);
    const matchesSearch = (p.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return isActive && matchesSearch;
  });

  const handleOpenDialog = (profile?: any) => {
    if (profile) {
      setEditingProfile(profile);
      setFormData({
        ...formData,
        fullName: profile.full_name || '',
        dni: profile.dni || '',
        position: profile.position || '',
        role: profile.role || 'worker',
        workDayType: profile.work_day_type || '8h',
        dailyHours: String(profile.daily_hours || '8'),
        password: '' // No mostramos la clave actual por seguridad en edición
      });
    } else {
      setEditingProfile(null);
      // GENERACIÓN AUTOMÁTICA DE PIN DE 4 DÍGITOS
      const autoPin = String(Math.floor(1000 + Math.random() * 9000));
      setFormData({
        fullName: '',
        dni: '',
        position: '',
        role: 'worker',
        workDayType: '8h',
        dailyHours: '8',
        password: autoPin
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: any = {
        full_name: formData.fullName,
        dni: formData.dni,
        position: formData.position,
        role: formData.role,
        work_day_type: formData.workDayType,
        daily_hours: parseFloat(formData.dailyHours)
      };

      if (editingProfile) {
        const { error } = await supabase.from('profiles').update(payload).eq('id', editingProfile.id);
        if (error) throw error;
        toast({ title: 'Actualizado', description: 'Ficha de personal guardada.' });
      } else {
        // Lógica de nuevo usuario
        const internalEmail = `${formData.dni.toLowerCase()}@ofimatic.com`;
        const { data, error: authError } = await supabase.auth.signUp({
          email: internalEmail,
          password: `worker_${formData.password}_${formData.dni}`,
        });
        if (authError) throw authError;
        
        if (data.user) {
          await supabase.from('profiles').update(payload).eq('id', data.user.id);
          await supabase.from('worker_credentials').insert({ 
            user_id: data.user.id, 
            access_code: formData.password 
          });
          toast({ title: 'Alta Exitosa', description: `Trabajador creado con PIN: ${formData.password}` });
        }
      }
      loadData();
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin h-10 w-10 mx-auto text-blue-500" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div className="flex bg-[#111] p-1 rounded-md border border-slate-800">
          <button onClick={() => setActiveTab('active')} className={`px-6 py-2 text-xs font-bold rounded ${activeTab === 'active' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>Activos</button>
          <button onClick={() => setActiveTab('deactivated')} className={`px-6 py-2 text-xs font-bold rounded ${activeTab === 'deactivated' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>Desactivados</button>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700 font-bold uppercase text-[10px] tracking-widest px-6 h-10">
          <Plus className="h-4 w-4 mr-2" /> Nuevo Alta
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input placeholder="Buscar trabajador..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent border-slate-800 pl-10 text-white" />
      </div>

      <Table>
        <TableHeader className="border-b border-slate-800">
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Nombre</TableHead>
            <TableHead className="text-slate-500 font-bold uppercase text-[10px]">DNI</TableHead>
            <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Clave</TableHead>
            <TableHead className="text-slate-500 font-bold uppercase text-[10px] text-center">Jornada</TableHead>
            <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Puesto</TableHead>
            <TableHead className="text-slate-500 font-bold uppercase text-[10px] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProfiles.map(p => (
            <TableRow key={p.id} className="border-slate-800 group hover:bg-slate-800/20">
              <TableCell className="py-4 font-bold text-white text-sm">{p.full_name}</TableCell>
              <TableCell className="py-4 text-slate-400 font-mono text-xs">{p.dni || '---'}</TableCell>
              <TableCell className="py-4">
                <div className="flex items-center gap-2 text-slate-500">
                  {visibleCodes[p.id] ? (workerCredentials.find(c => c.user_id === p.id)?.access_code || '---') : '••••'}
                  <button onClick={() => setVisibleCodes(prev => ({...prev, [p.id]: !prev[p.id]}))}>
                    {visibleCodes[p.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                </div>
              </TableCell>
              <TableCell className="py-4 text-center">
                <span className={`px-3 py-1 rounded-full text-[9px] font-black border ${p.work_day_type === 'Personalizada' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' : 'border-slate-700 text-slate-500'}`}>
                  {p.work_day_type === 'Personalizada' ? `Personalizada (${p.daily_hours}h)` : (p.work_day_type || '8h')}
                </span>
              </TableCell>
              <TableCell className="py-4 text-slate-400 text-xs font-bold uppercase tracking-wider">{p.position || '---'}</TableCell>
              <TableCell className="py-4 text-right">
                <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MonthlyReportDialog profile={p} />
                  <button onClick={() => handleOpenDialog(p)} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white"><Pencil className="h-4 w-4" /></button>
                  <button onClick={async () => {
                    if(confirm(`¿Dar de baja a ${p.full_name}?`)) {
                      await supabase.from('profiles').update({ is_active: false }).eq('id', p.id);
                      loadData();
                    }
                  }} className="p-1.5 hover:bg-red-500/10 rounded text-red-500/60 hover:text-red-500"><UserX className="h-4 w-4" /></button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-slate-950 text-white border-slate-800 shadow-2xl">
          <DialogHeader><DialogTitle className="uppercase font-black tracking-tighter">Ficha Técnica de Personal</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-1.5">
              <Label className="text-slate-500 uppercase text-[10px] font-bold">Nombre Completo</Label>
              <Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="bg-[#111] border-slate-800 focus:ring-blue-500" required />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-500 uppercase text-[10px] font-bold">DNI / NIE</Label>
                <Input value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value.toUpperCase()})} className="bg-[#111] border-slate-800" required disabled={!!editingProfile} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-500 uppercase text-[10px] font-bold">Puesto de Trabajo</Label>
                <Input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="bg-[#111] border-slate-800" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-500 uppercase text-[10px] font-bold">Tipo de Jornada</Label>
                <Select value={formData.workDayType} onValueChange={v => setFormData({...formData, workDayType: v})}>
                  <SelectTrigger className="bg-[#111] border-slate-800"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white font-bold uppercase text-[10px]">
                    <SelectItem value="8h">8h (Estándar)</SelectItem>
                    <SelectItem value="Personalizada">Personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* CAMPO DINÁMICO DE HORAS (SOLO SI ES PERSONALIZADA) */}
              <div className={`space-y-1.5 transition-all ${formData.workDayType === 'Personalizada' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                <Label className="text-blue-400 uppercase text-[10px] font-bold">Horas de Contrato</Label>
                <Input type="number" step="0.5" value={formData.dailyHours} onChange={e => setFormData({...formData, dailyHours: e.target.value})} className="bg-[#111] border-blue-900/50 text-blue-400 font-bold" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-500 uppercase text-[10px] font-bold">{editingProfile ? 'Nueva Clave (Opcional)' : 'PIN de Acceso (Auto-generado)'}</Label>
              <Input 
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                placeholder="4 dígitos"
                maxLength={4}
                className="bg-[#111] border-slate-800 font-mono text-xl tracking-[1em] text-center" 
              />
            </div>

            <DialogFooter className="pt-4 border-t border-slate-900">
              <Button type="submit" disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-700 font-black uppercase tracking-widest h-12 shadow-lg shadow-blue-900/20">
                {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />} 
                {editingProfile ? 'Actualizar Trabajador' : 'Confirmar Alta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
