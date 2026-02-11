import { useState, useEffect } from 'react';
import { 
  Plus, Pencil, UserX, Search, Eye, EyeOff, 
  Loader2, Printer
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// IMPORTANTE: Verifica que esta ruta sea correcta en tu estructura de carpetas
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
    workDayType: '8h'
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

      if (profError) throw profError;

      const { data: credsData } = await supabase
        .from('worker_credentials')
        .select('user_id, access_code');

      setProfiles(profilesData || []);
      setWorkerCredentials(credsData || []);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Error al cargar los trabajadores' });
    } finally {
      setLoading(false);
    }
  };

  const generateGeneralReport = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const activeWorkers = profiles.filter(p => p.is_active !== false);
      printWindow.document.write(`
        <html>
          <head>
            <title>Informe General - Ofimatic</title>
            <style>
              body { font-family: sans-serif; padding: 30px; }
              .header { border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
              th { background-color: #f8fafc; }
            </style>
          </head>
          <body>
            <div class="header"><h1>OFIMATIC - Listado de Plantilla</h1></div>
            <table>
              <thead><tr><th>Nombre</th><th>DNI</th><th>Puesto</th><th>Jornada</th></tr></thead>
              <tbody>
                ${activeWorkers.map(p => `<tr><td>${p.full_name}</td><td>${p.dni || '---'}</td><td>${p.position || '---'}</td><td>${p.work_day_type || '8h'}</td></tr>`).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const filteredProfiles = profiles.filter(p => {
    const isActive = activeTab === 'active' ? (p.is_active !== false) : (p.is_active === false);
    return isActive && p.full_name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleOpenDialog = (profile?: any) => {
    if (profile) {
      setEditingProfile(profile);
      setFormData({
        fullName: profile.full_name || '',
        dni: profile.dni || '',
        position: profile.position || '',
        role: profile.role || 'worker',
        workDayType: profile.work_day_type || '8h'
      });
    } else {
      setEditingProfile(null);
      setFormData({
        fullName: '', dni: '', position: '', role: 'worker', workDayType: '8h'
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingProfile) {
        const { error } = await supabase.from('profiles').update({
          full_name: formData.fullName,
          dni: formData.dni,
          position: formData.position,
          role: formData.role,
          work_day_type: formData.workDayType
        }).eq('id', editingProfile.id);
        if (error) throw error;
      }
      toast({ title: 'Éxito', description: 'Datos actualizados' });
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
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Gestión de Trabajadores</h2>
          <p className="text-slate-400 text-sm">Administración de plantilla y jornadas</p>
        </div>
        
        <div className="flex gap-3">
          <Button onClick={generateGeneralReport} variant="outline" className="border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-800 font-bold text-xs uppercase h-10 px-4">
            <Printer className="h-4 w-4 mr-2" /> Listado General
          </Button>
          <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700 font-bold text-xs uppercase h-10 px-6">
            <Plus className="h-4 w-4 mr-2" /> Nuevo Trabajador
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#111] border-slate-800"><CardContent className="p-6">
          <p className="text-slate-500 text-xs font-bold uppercase">Total</p>
          <p className="text-3xl font-bold text-white mt-1">{profiles.length}</p>
        </CardContent></Card>
        <Card className="bg-[#111] border-slate-800"><CardContent className="p-6">
          <p className="text-slate-500 text-xs font-bold uppercase">Activos</p>
          <p className="text-3xl font-bold text-emerald-500 mt-1">{profiles.filter(p => p.is_active !== false).length}</p>
        </CardContent></Card>
        <Card className="bg-[#111] border-slate-800"><CardContent className="p-6">
          <p className="text-slate-500 text-xs font-bold uppercase">Desactivados</p>
          <p className="text-3xl font-bold text-slate-500 mt-1">{profiles.filter(p => p.is_active === false).length}</p>
        </CardContent></Card>
      </div>

      <div className="flex justify-between items-center mt-8">
        <div className="flex bg-[#111] p-1 rounded-md border border-slate-800">
          <button onClick={() => setActiveTab('active')} className={`px-4 py-1.5 text-xs font-bold rounded ${activeTab === 'active' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500'}`}>Activos</button>
          <button onClick={() => setActiveTab('deactivated')} className={`px-4 py-1.5 text-xs font-bold rounded ${activeTab === 'deactivated' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500'}`}>Desactivados</button>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input placeholder="Buscar por nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent border-slate-800 pl-10 text-white text-sm" />
        </div>
      </div>

      <Table className="mt-4">
        <TableHeader className="border-b border-slate-800">
          <TableRow className="hover:bg-transparent border-none">
            <TableHead className="text-slate-500 font-bold text-xs uppercase">Nombre</TableHead>
            <TableHead className="text-slate-500 font-bold text-xs uppercase">DNI</TableHead>
            <TableHead className="text-slate-500 font-bold text-xs uppercase">Clave</TableHead>
            <TableHead className="text-slate-500 font-bold text-xs uppercase">Jornada</TableHead>
            <TableHead className="text-slate-500 font-bold text-xs uppercase">Informe</TableHead>
            <TableHead className="text-slate-500 font-bold text-xs uppercase text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProfiles.map(p => (
            <TableRow key={p.id} className="border-slate-800/50 hover:bg-slate-800/20 group transition-colors">
              <TableCell className="py-4 font-bold text-white text-sm">{p.full_name}</TableCell>
              <TableCell className="py-4 text-slate-300 font-mono text-xs">{p.dni || '---'}</TableCell>
              <TableCell className="py-4">
                <div className="flex items-center gap-2 text-slate-400 font-mono">
                  {visibleCodes[p.id] ? (workerCredentials.find(c => c.user_id === p.id)?.access_code || '---') : '••••'}
                  <button onClick={() => setVisibleCodes(prev => ({...prev, [p.id]: !prev[p.id]}))} className="hover:text-white transition-colors">
                    {visibleCodes[p.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </TableCell>
              <TableCell className="py-4">
                <span className="px-3 py-1 rounded-full border border-slate-700 text-slate-400 text-[10px] font-bold">
                  {p.work_day_type || '8h'}
                </span>
              </TableCell>
              <TableCell className="py-4">
                <MonthlyReportDialog profile={p} />
              </TableCell>
              <TableCell className="py-4 text-right">
                <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenDialog(p)} className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white"><Pencil className="h-4 w-4" /></button>
                  <button className="p-1.5 hover:bg-red-500/10 rounded-md text-red-500/60 hover:text-red-500"><UserX className="h-4 w-4" /></button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-slate-950 text-white border-slate-800">
          <DialogHeader><DialogTitle className="uppercase font-black text-xl">Ficha Empleado</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-1.5"><Label className="text-slate-500 uppercase text-[10px] font-bold">Nombre Completo</Label><Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="bg-[#111] border-slate-800" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-slate-500 uppercase text-[10px] font-bold">DNI</Label><Input value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value.toUpperCase()})} className="bg-[#111] border-slate-800" /></div>
              <div className="space-y-1.5"><Label className="text-slate-500 uppercase text-[10px] font-bold">Puesto</Label><Input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="bg-[#111] border-slate-800" /></div>
            </div>
            <DialogFooter><Button type="submit" disabled={isSaving} className="w-full bg-blue-600 font-black uppercase h-11">{isSaving ? 'Guardando...' : 'Guardar Ficha'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
