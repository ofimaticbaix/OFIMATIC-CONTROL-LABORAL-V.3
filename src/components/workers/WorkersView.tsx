import { useState, useEffect } from 'react';
import { 
  Plus, Pencil, Trash2, UserX, Search, Eye, EyeOff, Save, 
  Shield, BadgeCheck, Briefcase, Hash, Loader2, Mail, ExternalLink 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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

  const [formData, setFormData] = useState({
    fullName: '',
    dni: '',
    position: '',
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
    const [profilesResult, credentialsResult] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name', { ascending: true }),
      supabase.from('worker_credentials').select('user_id, access_code')
    ]);
    if (profilesResult.data) setProfiles(profilesResult.data);
    if (credentialsResult.data) setWorkerCredentials(credentialsResult.data);
    setLoading(false);
  };

  // Variables de filtrado corregidas para evitar errores "is not defined"
  const activeProfiles = profiles.filter(p => p.is_active !== false);
  const deactivatedProfiles = profiles.filter(p => p.is_active === false);
  const currentProfiles = activeTab === 'active' ? activeProfiles : deactivatedProfiles;
  
  const filteredProfiles = currentProfiles.filter(p => 
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.dni && p.dni.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDayChange = (day: string, field: string, value: any) => {
    const updated: any = { ...formData.work_schedule };
    updated[day] = { ...updated[day], [field]: value };
    if (field === 'start' || field === 'end') {
      const [h1, m1] = updated[day].start.split(':').map(Number);
      const [h2, m2] = updated[day].end.split(':').map(Number);
      const diff = (h2 + m2/60) - (h1 + m1/60);
      updated[day].totalHours = diff > 0 ? parseFloat(diff.toFixed(2)) : 0;
    }
    setFormData({ ...formData, work_schedule: updated });
  };

  const handleOpenDialog = (profile?: any) => {
    if (profile) {
      setEditingProfile(profile);
      setIsCustomSchedule(!!profile.work_schedule);
      setFormData({
        ...formData,
        fullName: profile.full_name,
        dni: profile.dni || '',
        position: profile.position || '',
        dailyHours: profile.daily_hours ? String(profile.daily_hours) : '8',
        work_schedule: profile.work_schedule || formData.work_schedule
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('profiles').update({
      full_name: formData.fullName,
      dni: formData.dni,
      position: formData.position,
      daily_hours: parseFloat(formData.dailyHours) || 8,
      work_schedule: isCustomSchedule ? formData.work_schedule : null
    }).eq('id', editingProfile.id);

    if (error) return toast({ variant: 'destructive', title: 'Error' });
    toast({ title: 'Perfil Actualizado' });
    loadData();
    setIsDialogOpen(false);
  };

  const toggleCodeVisibility = (userId: string) => setVisibleCodes(prev => ({ ...prev, [userId]: !prev[userId] }));

  // Corrección del error "Loader2 is not defined"
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 className="animate-spin h-10 w-10 text-blue-500" />
      <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Cargando Plantilla...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Gestión de Trabajadores</h2>
          <p className="text-slate-400 text-sm">Administración centralizada de personal y horarios de contrato.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Buscar..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-10 bg-slate-900 border-slate-800 text-white"
            />
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700 font-bold uppercase text-xs tracking-widest">
            <Plus className="h-4 w-4 mr-2" /> Alta
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v:any) => setActiveTab(v)} className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800 p-1">
          <TabsTrigger value="active" className="text-xs font-bold uppercase tracking-widest px-8">Personal en Activo</TabsTrigger>
          <TabsTrigger value="deactivated" className="text-xs font-bold uppercase tracking-widest px-8">Histórico de Bajas</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card className="bg-slate-900 border-slate-800 shadow-2xl overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-950">
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest p-4">Ficha Empleado</TableHead>
                    <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest p-4 text-center">PIN Fichaje</TableHead>
                    <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest p-4">Cargo y Puesto</TableHead>
                    <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest p-4">Contrato Laboral</TableHead>
                    <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest p-4 text-right">Gestión</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map(p => {
                    const pin = workerCredentials.find(c => c.user_id === p.id)?.access_code;
                    return (
                      <TableRow key={p.id} className="border-slate-800 hover:bg-slate-800/40 transition-colors group">
                        <TableCell className="p-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-slate-100 flex items-center gap-2 italic">
                              {p.full_name}
                              <BadgeCheck className="h-3 w-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                              <Hash className="h-3 w-3" /> {p.dni || '---'} | <Mail className="h-3 w-3 ml-1" /> {p.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 shadow-inner">
                              <span className="font-mono font-black text-emerald-500 text-sm tracking-[0.2em]">
                                {visibleCodes[p.id] ? pin : '****'}
                              </span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-800" onClick={() => toggleCodeVisibility(p.id)}>
                              {visibleCodes[p.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="p-4">
                          <Badge variant="outline" className="border-slate-700 bg-slate-950/50 text-slate-300 text-[10px] font-bold uppercase tracking-widest">
                            <Briefcase className="h-3 w-3 mr-2 text-blue-400" /> {p.position || 'OFIMATIC'}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-4">
                          {p.work_schedule ? (
                            <div className="flex flex-col gap-1">
                              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px] font-black w-fit tracking-widest">CUADRANTE VARIABLE</Badge>
                              <span className="text-[9px] text-slate-500 font-bold uppercase">Sábados incl.</span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <Badge variant="secondary" className="text-[9px] font-black w-fit uppercase tracking-widest">HORARIO FIJO</Badge>
                              <span className="text-[9px] text-slate-400 font-bold uppercase">{p.daily_hours || 8}H DIARIAS</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <MonthlyReportDialog profile={p} />
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(p)} className="text-blue-500 hover:bg-blue-500/20 border border-transparent hover:border-blue-500/30">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL DE EDICIÓN - INTEGRADO CON CONFIGURACIÓN DE JORNADA */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl bg-slate-950 text-white border-slate-800 shadow-2xl">
          <DialogHeader className="border-b border-slate-900 pb-4 mb-4">
            <DialogTitle className="uppercase font-black text-xl tracking-tighter flex items-center gap-2">
              <Pencil className="text-blue-500 h-5 w-5" /> Ficha de Contratación
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Nombre Completo</Label>
                <Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="bg-slate-900 border-slate-800 focus:ring-blue-500" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Especialidad / Cargo</Label>
                <Input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="bg-slate-900 border-slate-800 focus:ring-blue-500" />
              </div>
            </div>

            <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800">
              <Label className="text-[10px] uppercase font-bold text-slate-500 mb-4 block tracking-widest flex items-center gap-2">
                <Clock className="h-3 w-3 text-blue-400" /> Horas Laborales por Contrato
              </Label>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-6 shadow-inner">
                <Button type="button" variant={!isCustomSchedule ? "default" : "ghost"} className={`flex-1 text-[10px] font-black h-9 rounded-lg ${!isCustomSchedule ? 'bg-slate-800 text-white' : 'text-slate-600'}`} onClick={() => setIsCustomSchedule(false)}>FIJO (8H)</Button>
                <Button type="button" variant={isCustomSchedule ? "default" : "ghost"} className={`flex-1 text-[10px] font-black h-9 rounded-lg ${isCustomSchedule ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-600'}`} onClick={() => setIsCustomSchedule(true)}>PERSONALIZADO</Button>
              </div>

              {isCustomSchedule ? (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                  {Object.entries(formData.work_schedule).map(([day, config]: any) => (
                    <div key={day} className="flex items-center justify-between text-[11px] bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50">
                      <div className="flex items-center gap-3 w-28">
                        <Checkbox checked={config.active} onCheckedChange={(v) => handleDayChange(day, 'active', v)} className="border-slate-700 data-[state=checked]:bg-blue-500" />
                        <span className={`font-black uppercase tracking-widest ${config.active ? 'text-white' : 'text-slate-600'}`}>{day}</span>
                      </div>
                      {config.active ? (
                        <div className="flex items-center gap-2">
                          <Input type="time" value={config.start} onChange={e => handleDayChange(day, 'start', e.target.value)} className="h-8 w-24 bg-slate-950 border-slate-800 text-[10px] font-mono" />
                          <span className="text-slate-600 font-bold uppercase text-[9px]">A</span>
                          <Input type="time" value={config.end} onChange={e => handleDayChange(day, 'end', e.target.value)} className="h-8 w-24 bg-slate-950 border-slate-800 text-[10px] font-mono" />
                          <span className="text-blue-400 font-black text-[10px] ml-2">{config.totalHours}H</span>
                        </div>
                      ) : <span className="text-slate-700 italic text-[10px] font-bold uppercase tracking-widest">No Laborable</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-[10px] text-slate-500 font-bold uppercase">Meta diaria de horas</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                    <Input type="number" value={formData.dailyHours} onChange={e => setFormData({...formData, dailyHours: e.target.value})} className="bg-slate-950 border-slate-800 pl-10" />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="pt-2">
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-900/20 text-xs font-black uppercase tracking-widest h-11">
                <Save className="h-4 w-4 mr-2" /> Actualizar Ficha y Contrato
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
