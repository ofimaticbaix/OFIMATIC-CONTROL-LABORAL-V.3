import { useState, useEffect } from 'react';
import { 
  Plus, Pencil, UserX, Search, Eye, EyeOff, Save, 
  ShieldAlert, Loader2, UserCog, Briefcase
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
    password: '',
    fullName: '',
    dni: '',
    position: '',
    role: 'worker',
    dailyHours: '8'
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

      const { data: credsData, error: credError } = await supabase
        .from('worker_credentials')
        .select('user_id, access_code');

      if (profError) throw profError;
      setProfiles(profilesData || []);
      setWorkerCredentials(credsData || []);
    } catch (err: any) {
      console.error("Error cargando trabajadores:", err);
      toast({ 
        variant: 'destructive', 
        title: 'Error de acceso', 
        description: 'No tienes permisos para ver la lista de trabajadores.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(p => {
    const isActive = activeTab === 'active' ? (p.is_active !== false) : (p.is_active === false);
    const name = p.full_name || '';
    const dni = p.dni || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dni.toLowerCase().includes(searchTerm.toLowerCase());
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
        dailyHours: String(profile.daily_hours || '8')
      });
    } else {
      setEditingProfile(null);
      setFormData({
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
    try {
      if (editingProfile) {
        const { error } = await supabase.from('profiles').update({
          full_name: formData.fullName,
          dni: formData.dni,
          position: formData.position,
          role: formData.role,
          daily_hours: parseFloat(formData.dailyHours)
        }).eq('id', editingProfile.id);
        if (error) throw error;
      } else {
        const internalEmail = `${formData.dni.toLowerCase()}@ofimatic.com`;
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: internalEmail,
          password: `worker_${formData.password}_${formData.dni}`,
        });
        if (signUpError) throw signUpError;
        if (data.user) {
          await supabase.from('profiles').update({ 
            dni: formData.dni, position: formData.position, role: formData.role 
          }).eq('id', data.user.id);
          await supabase.from('worker_credentials').insert({ user_id: data.user.id, access_code: formData.password });
        }
      }
      toast({ title: 'Operación exitosa', description: 'Los datos se han guardado.' });
      loadData();
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error al guardar', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 className="animate-spin h-10 w-10 text-blue-500" />
      <p className="text-slate-500 font-bold uppercase text-xs tracking-widest italic text-center">Validando privilegios...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-white italic">Plantilla</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Gestión de Personal</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Buscar..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-10 bg-slate-900 border-slate-800 text-white h-10"
            />
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700 font-black uppercase text-xs tracking-widest h-10 px-6">
            <Plus className="h-4 w-4 mr-2" /> Nuevo Alta
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v:any) => setActiveTab(v)}>
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="active" className="text-xs font-bold uppercase px-8">Personal Activo</TabsTrigger>
          <TabsTrigger value="deactivated" className="text-xs font-bold uppercase px-8">Bajas</TabsTrigger>
        </TabsList>

        <Card className="bg-slate-900 border-slate-800 mt-4 overflow-hidden shadow-2xl">
          <Table>
            <TableHeader className="bg-slate-950">
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-500 font-black uppercase text-[10px] p-4">Empleado</TableHead>
                <TableHead className="text-slate-500 font-black uppercase text-[10px] p-4">Cargo / Rol</TableHead>
                <TableHead className="text-slate-500 font-black uppercase text-[10px] p-4 text-center">PIN Fichaje</TableHead>
                <TableHead className="text-slate-500 font-black uppercase text-[10px] p-4 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProfiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-20 text-slate-600 font-bold uppercase text-xs italic tracking-widest">
                    No hay trabajadores disponibles.
                  </TableCell>
                </TableRow>
              ) : filteredProfiles.map(p => (
                <TableRow key={p.id} className="border-slate-800 hover:bg-slate-800/40 transition-colors">
                  <TableCell className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-100 flex items-center gap-2">
                        {p.full_name}
                        {p.role === 'admin' && <ShieldAlert className="h-3 w-3 text-amber-500" />}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono tracking-tighter">{p.dni || '---'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="p-4">
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="text-[9px] font-bold uppercase border-slate-700 text-slate-300 w-fit">
                        <Briefcase className="h-3 w-3 mr-1 text-blue-400" /> {p.position || 'SIN CARGO'}
                      </Badge>
                      <Badge className={`${p.role === 'admin' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800 text-slate-500'} text-[9px] font-black w-fit uppercase`}>{p.role}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="p-4 text-center">
                    <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 inline-block font-mono font-black text-blue-400 tracking-widest">
                      {visibleCodes[p.id] ? (workerCredentials.find(c => c.user_id === p.id)?.access_code || '****') : '****'}
                      <Button variant="ghost" size="icon" className="h-4 w-4 ml-2" onClick={() => setVisibleCodes(prev => ({...prev, [p.id]: !prev[p.id]}))}>
                         {visibleCodes[p.id] ? <EyeOff className="h-3 w-3 text-slate-600" /> : <Eye className="h-3 w-3 text-slate-600" />}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(p)} className="text-blue-500 hover:bg-blue-500/10"><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-500/10"><UserX className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-950 border-slate-800 text-white shadow-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="uppercase font-black text-xl tracking-tighter">Baja de Personal</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400">¿Estás seguro de que quieres dar de baja a {p.full_name}?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-900 border-slate-800">Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => {
                              supabase.from('profiles').update({ is_active: false }).eq('id', p.id).then(() => {
                                toast({ title: 'Baja confirmada' });
                                loadData();
                              });
                            }} className="bg-red-600 hover:bg-red-700 font-bold uppercase text-xs">Confirmar</AlertDialogAction>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl bg-slate-950 text-white border-slate-800 shadow-2xl">
          <DialogHeader className="border-b border-slate-900 pb-4 mb-4">
            <DialogTitle className="uppercase font-black text-xl tracking-tighter flex items-center gap-2">
              <UserCog className="text-blue-500 h-5 w-5" /> Ficha de Personal
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-slate-500">Nombre</Label><Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="bg-slate-900 border-slate-800" /></div>
              <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-slate-500">DNI / NIE</Label><Input value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value.toUpperCase()})} className="bg-slate-900 border-slate-800" disabled={!!editingProfile} /></div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-slate-500">Cargo</Label><Input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="bg-slate-900 border-slate-800" /></div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Rol</Label>
                <Select value={formData.role} onValueChange={(val) => setFormData({...formData, role: val})}>
                  <SelectTrigger className="bg-slate-900 border-slate-800"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white font-bold text-[10px] uppercase">
                    <SelectItem value="worker">Trabajador</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="submit" disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-900/20 text-xs font-black uppercase tracking-widest h-11">
                {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />} 
                {editingProfile ? 'Actualizar Ficha' : 'Dar de Alta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
