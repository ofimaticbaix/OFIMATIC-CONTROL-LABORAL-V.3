import { useState, useEffect } from 'react';
import { 
  Plus, Pencil, UserX, Search, Eye, EyeOff, Save, 
  Loader2, Shield, UserCog, Lock
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
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCodes, setVisibleCodes] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    dni: '',
    position: '',
    role: 'worker',
    workDayType: 'Estándar',
    dailyHours: '8',
    password: '' // Aquí se gestiona el PIN
  });

  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: profilesData } = await supabase.from('profiles').select('*').order('full_name');
      const { data: credsData } = await supabase.from('worker_credentials').select('*');
      setProfiles(profilesData || []);
      setWorkerCredentials(credsData || []);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Error al cargar datos.' });
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
        password: creds?.access_code || '' // Cargamos el PIN actual para editar
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
      const payload = {
        full_name: formData.fullName,
        dni: formData.dni,
        position: formData.position,
        role: formData.role,
        work_day_type: formData.workDayType,
        daily_hours: parseFloat(formData.dailyHours)
      };

      if (editingProfile) {
        // Actualizar Perfil
        await supabase.from('profiles').update(payload).eq('id', editingProfile.id);
        // Actualizar PIN en credenciales
        await supabase.from('worker_credentials')
          .update({ access_code: formData.password })
          .eq('user_id', editingProfile.id);
        
        toast({ title: 'Actualizado', description: 'Datos y PIN actualizados correctamente.' });
      } else {
        // Lógica para Nuevo Alta (SignUp + Insert Credentials)
        // ... (Tu lógica de Auth actual)
      }
      
      loadData();
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-20 text-center text-white">Cargando plantilla...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Gestión de Personal</h2>
        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700 font-bold uppercase text-[10px]">
          <Plus className="h-4 w-4 mr-2" /> Nuevo Alta
        </Button>
      </div>

      <div className="bg-[#0a0a0a] border border-slate-800 rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-900/50">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Nombre</TableHead>
              <TableHead className="text-slate-500 font-bold uppercase text-[10px]">PIN de Acceso</TableHead>
              <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Puesto</TableHead>
              <TableHead className="text-slate-500 font-bold uppercase text-[10px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map(p => {
              const pin = workerCredentials.find(c => c.user_id === p.id)?.access_code || '----';
              return (
                <TableRow key={p.id} className="border-slate-800 hover:bg-slate-800/20 group">
                  <TableCell className="font-bold text-white py-4">{p.full_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 bg-slate-900 w-fit px-3 py-1 rounded border border-slate-800">
                      <Lock className="h-3 w-3 text-slate-500" />
                      <span className="font-mono font-bold text-blue-400">
                        {visibleCodes[p.id] ? pin : '••••'}
                      </span>
                      <button 
                        onClick={() => setVisibleCodes(prev => ({...prev, [p.id]: !prev[p.id]}))}
                        className="text-slate-500 hover:text-white transition-colors"
                      >
                        {visibleCodes[p.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-400 uppercase font-bold">{p.position || '---'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MonthlyReportDialog profile={p} />
                      <button onClick={() => handleOpenDialog(p)} className="p-2 hover:bg-slate-700 rounded text-slate-400">
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
        <DialogContent className="bg-slate-950 text-white border-slate-800">
          <DialogHeader><DialogTitle className="font-black uppercase italic">Editar Ficha de Personal</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 pt-4">
            
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-500">Nombre Completo</Label>
              <Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="bg-[#111] border-slate-800" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Puesto</Label>
                <Input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="bg-[#111] border-slate-800" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-blue-500">PIN de Acceso</Label>
                <Input 
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})} 
                  className="bg-[#111] border-blue-900/50 font-mono font-bold text-center tracking-widest text-lg"
                  maxLength={4}
                />
              </div>
            </div>

            {/* Resto de campos de jornada... */}
            
            <DialogFooter>
              <Button type="submit" disabled={isSaving} className="w-full bg-blue-600 font-black uppercase h-12">
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
