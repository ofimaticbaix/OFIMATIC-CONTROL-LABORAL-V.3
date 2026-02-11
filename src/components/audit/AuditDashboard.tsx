import { useState, useEffect } from 'react';
import { 
  Plus, Pencil, UserX, Search, Eye, EyeOff, Save, 
  ShieldAlert, Loader2, UserCog
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
    } finally {
      setLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(p => {
    const isActive = activeTab === 'active' ? (p.is_active !== false) : (p.is_active === false);
    const matchesSearch = p.full_name.toLowerCase().includes(searchTerm.toLowerCase());
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
        await supabase.from('profiles').update({
          full_name: formData.fullName,
          dni: formData.dni,
          position: formData.position,
          role: formData.role,
          daily_hours: parseFloat(formData.dailyHours)
        }).eq('id', editingProfile.id);
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: `${formData.dni.toLowerCase()}@ofimatic.com`,
          password: `worker_${formData.password}`,
        });
        if (signUpError) throw signUpError;
        if (data.user) {
          await supabase.from('profiles').update({ 
            dni: formData.dni, position: formData.position, role: formData.role 
          }).eq('id', data.user.id);
          await supabase.from('worker_credentials').insert({ user_id: data.user.id, access_code: formData.password });
        }
      }
      toast({ title: 'Éxito', description: 'Datos guardados correctamente' });
      loadData();
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto h-10 w-10 text-blue-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black uppercase text-white italic">Plantilla</h2>
        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 font-bold uppercase text-xs">
          <Plus className="h-4 w-4 mr-2" /> Nuevo Alta
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="bg-slate-900 border-slate-800">
          <TabsTrigger value="active">Activos</TabsTrigger>
          <TabsTrigger value="deactivated">Bajas</TabsTrigger>
        </TabsList>

        <Card className="bg-slate-900 border-slate-800 mt-4">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-500 uppercase text-[10px]">Trabajador</TableHead>
                <TableHead className="text-slate-500 uppercase text-[10px]">Rol</TableHead>
                <TableHead className="text-slate-500 uppercase text-[10px] text-center">PIN</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProfiles.map(p => (
                <TableRow key={p.id} className="border-slate-800">
                  <TableCell className="font-bold text-white">{p.full_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="uppercase text-[9px]">{p.role}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-mono text-blue-400">
                      {visibleCodes[p.id] ? (workerCredentials.find(c => c.user_id === p.id)?.access_code || '****') : '****'}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => setVisibleCodes(prev => ({...prev, [p.id]: !prev[p.id]}))}>
                      {visibleCodes[p.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" onClick={() => handleOpenDialog(p)} className="text-blue-500"><Pencil className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-slate-950 text-white border-slate-800">
          <DialogHeader><DialogTitle className="uppercase font-black">Ficha Trabajador</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase text-slate-500">Nombre Completo</Label>
              <Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="bg-slate-900 border-slate-800" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase text-slate-500">DNI</Label>
                <Input value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value.toUpperCase()})} className="bg-slate-900 border-slate-800" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase text-slate-500">Rol</Label>
                <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                  <SelectTrigger className="bg-slate-900 border-slate-800"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="worker">Trabajador</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={isSaving} className="w-full bg-blue-600 font-black uppercase">
              {isSaving ? "Guardando..." : "Guardar Ficha"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
