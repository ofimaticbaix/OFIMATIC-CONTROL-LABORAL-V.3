import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, UserX, Search, Eye, EyeOff, Save, Shield, BadgeCheck, Briefcase, Hash } from 'lucide-react';
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

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Gestión de Trabajadores</h2>
          <p className="text-slate-400 text-sm">Administre la plantilla, horarios y credenciales de acceso.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Buscar por nombre o DNI..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="pl-10 bg-slate-900 border-slate-800 text-white"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v:any) => setActiveTab(v)} className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800 p-1">
          <TabsTrigger value="active" className="text-xs font-bold uppercase tracking-widest px-6">Empleados Activos</TabsTrigger>
          <TabsTrigger value="deactivated" className="text-xs font-bold uppercase tracking-widest px-6">Bajas / Desactivados</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card className="bg-slate-900 border-slate-800 shadow-2xl overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-950">
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest p-4"><Shield className="h-3 w-3 inline mr-2" />Trabajador</TableHead>
                    <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest p-4"><Hash className="h-3 w-3 inline mr-2" />DNI / NIE</TableHead>
                    <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest p-4">Acceso (PIN)</TableHead>
                    <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest p-4"><Briefcase className="h-3 w-3 inline mr-2" />Cargo</TableHead>
                    <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest p-4"><Clock className="h-3 w-3 inline mr-2" />Jornada</TableHead>
                    <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest p-4 text-right">Gestión</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map(p => {
                    const pin = workerCredentials.find(c => c.user_id === p.id)?.access_code;
                    return (
                      <TableRow key={p.id} className="border-slate-800 hover:bg-slate-800/40 transition-colors">
                        <TableCell className="p-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-100">{p.full_name}</span>
                            <span className="text-[10px] text-slate-500 lowercase">{p.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="p-4 font-mono text-xs text-slate-400">{p.dni || '---'}</TableCell>
                        <TableCell className="p-4">
                          <div className="flex items-center gap-2">
                            <code className="bg-slate-950 px-2 py-1 rounded border border-slate-800 text-blue-400 font-bold text-xs">
                              {visibleCodes[p.id] ? pin : '••••'}
                            </code>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleCodeVisibility(p.id)}>
                              {visibleCodes[p.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="p-4">
                          <Badge variant="outline" className="border-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-tighter">
                            {p.position || 'General'}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-4">
                          {p.work_schedule ? (
                            <div className="flex flex-col gap-1">
                              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px] font-black w-fit">VARIABLE</Badge>
                              <span className="text-[9px] text-slate-500 italic">Horario semanal</span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <Badge variant="secondary" className="text-[9px] font-black w-fit uppercase">ESTÁNDAR</Badge>
                              <span className="text-[9px] text-slate-400 font-bold">{p.daily_hours || 8}h / día</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <MonthlyReportDialog profile={p} />
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(p)} className="text-blue-500 hover:bg-blue-500/10">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div >
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

      {/* MODAL DE EDICIÓN (Se mantiene igual pero con estilos corregidos) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl bg-slate-950 text-white border-slate-800 shadow-2xl">
          <DialogHeader><DialogTitle className="uppercase font-black flex items-center gap-2"><BadgeCheck className="text-blue-500" /> Configuración del Trabajador</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Nombre completo</Label><Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="bg-slate-900 border-slate-800" /></div>
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Cargo / Puesto</Label><Input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="bg-slate-900 border-slate-800" /></div>
            </div>

            <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-800">
              <Label className="text-[10px] uppercase font-bold text-slate-500 mb-3 block tracking-widest">Ajuste de Jornada Laboral</Label>
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 mb-4">
                <Button type="button" variant={!isCustomSchedule ? "default" : "ghost"} className={`flex-1 text-[10px] font-bold h-8 ${!isCustomSchedule ? 'bg-slate-800' : ''}`} onClick={() => setIsCustomSchedule(false)}>Fijo (8h)</Button>
                <Button type="button" variant={isCustomSchedule ? "default" : "ghost"} className={`flex-1 text-[10px] font-bold h-8 ${isCustomSchedule ? 'bg-blue-600' : ''}`} onClick={() => setIsCustomSchedule(true)}>Personalizado</Button>
              </div>

              {isCustomSchedule ? (
                <div className="space-y-2 max-h-60 overflow-auto pr-2">
                  {Object.keys(formData.work_schedule).map((day: any) => (
                    <div key={day} className="flex items-center justify-between text-[11px] border-b border-slate-800/50 pb-2 last:border-0">
                      <div className="flex items-center gap-2 w-24">
                        <Checkbox checked={(formData.work_schedule as any)[day].active} onCheckedChange={(v) => handleDayChange(day, 'active', v)} />
                        <span className="font-bold uppercase tracking-tighter">{day}</span>
                      </div>
                      {(formData.work_schedule as any)[day].active ? (
                        <div className="flex items-center gap-2">
                          <Input type="time" value={(formData.work_schedule as any)[day].start} onChange={e => handleDayChange(day, 'start', e.target.value)} className="h-7 w-20 bg-slate-950 text-[10px] border-slate-700" />
                          <span className="text-slate-600">a</span>
                          <Input type="time" value={(formData.work_schedule as any)[day].end} onChange={e => handleDayChange(day, 'end', e.target.value)} className="h-7 w-20 bg-slate-950 text-[10px] border-slate-700" />
                        </div>
                      ) : <span className="text-slate-600 italic">Libre</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1"><Label className="text-xs text-slate-400">Horas de contrato diarias</Label><Input type="number" value={formData.dailyHours} onChange={e => setFormData({...formData, dailyHours: e.target.value})} className="bg-slate-950 border-slate-700" /></div>
              )}
            </div>
            <DialogFooter className="pt-2"><Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 font-bold uppercase tracking-widest"><Save className="h-4 w-4 mr-2" /> Actualizar Ficha</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
