import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, UserCheck, UserX, Search, Eye, EyeOff, RefreshCw, Key, RotateCcw, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Profile, UserRole } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validatePassword, getPasswordRequirementsMessage } from '@/lib/passwordValidation';
import { MonthlyReportDialog } from '../admin/MonthlyReportDialog';

interface WorkerCredential {
  user_id: string;
  access_code: string;
}

// Extendemos la interfaz localmente por si no está actualizada en types.ts
interface ExtendedProfile extends Profile {
  daily_hours?: number;
}

export const WorkersView = () => {
  const [profiles, setProfiles] = useState<ExtendedProfile[]>([]);
  const [workerCredentials, setWorkerCredentials] = useState<WorkerCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ExtendedProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'deactivated'>('active');
  const [showPassword, setShowPassword] = useState(false);
  const [visibleCodes, setVisibleCodes] = useState<Record<string, boolean>>({});
  const [editingCodeId, setEditingCodeId] = useState<string | null>(null);
  const [editingCodeValue, setEditingCodeValue] = useState('');
  
  // FORMULARIO: Añadimos dailyHours
  const [formData, setFormData] = useState({
    password: '',
    fullName: '',
    dni: '',
    position: '',
    role: 'worker' as UserRole,
    dailyHours: '8', // Por defecto 8 horas
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const generateUniqueCode = async (): Promise<string> => {
    const existingCodes = workerCredentials.map(c => c.access_code);
    let code: string;
    let attempts = 0;
    do {
      code = String(Math.floor(1000 + Math.random() * 9000));
      attempts++;
    } while (existingCodes.includes(code) && attempts < 100);
    
    if (attempts >= 100) {
      for (let i = 1000; i <= 9999; i++) {
        if (!existingCodes.includes(String(i))) return String(i);
      }
    }
    return code;
  };

  const loadData = async () => {
    setLoading(true);
    const [profilesResult, credentialsResult] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('worker_credentials').select('user_id, access_code')
    ]);

    if (profilesResult.error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los trabajadores' });
    } else {
      setProfiles(profilesResult.data as ExtendedProfile[]);
    }

    if (!credentialsResult.error) {
      setWorkerCredentials(credentialsResult.data as WorkerCredential[]);
    }
    setLoading(false);
  };

  const getWorkerAccessCode = (userId: string): string | null => {
    const credential = workerCredentials.find(c => c.user_id === userId);
    return credential?.access_code || null;
  };

  const loadProfiles = () => loadData();

  const resetForm = () => {
    setFormData({ password: '', fullName: '', dni: '', position: '', role: 'worker', dailyHours: '8' });
    setEditingProfile(null);
    setShowPassword(false);
  };

  const handleOpenDialog = async (profile?: ExtendedProfile) => {
    if (profile) {
      setEditingProfile(profile);
      setFormData({
        password: '',
        fullName: profile.full_name,
        dni: profile.dni || '',
        position: profile.position || '',
        role: profile.role,
        dailyHours: profile.daily_hours ? String(profile.daily_hours) : '8',
      });
    } else {
      resetForm();
      if (formData.role === 'worker' || formData.role === undefined) {
        const uniqueCode = await generateUniqueCode();
        setFormData(prev => ({ ...prev, password: uniqueCode, role: 'worker' }));
      }
    }
    setIsDialogOpen(true);
  };

  const generateEmail = (dni: string) => `${dni.toLowerCase().replace(/[^a-z0-9]/g, '')}@rescalewaves.com`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.dni) {
      toast({ title: 'Error', description: 'Complete campos obligatorios', variant: 'destructive' });
      return;
    }

    const hours = parseFloat(formData.dailyHours) || 8;

    if (editingProfile) {
      const { error } = await supabase.from('profiles').update({
        full_name: formData.fullName, 
        dni: formData.dni, 
        position: formData.position || null, 
        role: formData.role,
        daily_hours: hours // Guardamos horas contrato
      }).eq('id', editingProfile.id);

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar' });
        return;
      }
      toast({ title: 'Actualizado', description: 'Trabajador actualizado correctamente' });
    } else {
      if (!formData.password) {
        toast({ title: 'Error', description: 'Falta contraseña/clave', variant: 'destructive' });
        return;
      }
      const validation = validatePassword(formData.password, formData.role);
      if (!validation.isValid) {
        toast({ title: 'Contraseña inválida', description: validation.errors.join(', '), variant: 'destructive' });
        return;
      }

      const internalEmail = generateEmail(formData.dni);
      const authPassword = formData.role === 'worker' ? `worker_${formData.password}_${formData.dni}` : formData.password;

      const { error } = await supabase.auth.signUp({
        email: internalEmail, password: authPassword,
        options: { emailRedirectTo: `${window.location.origin}/`, data: { full_name: formData.fullName, role: formData.role } },
      });

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      const { data: newProfiles } = await supabase.from('profiles').select('*').eq('email', internalEmail).single();

      if (newProfiles) {
        // Actualizamos datos extra incluyendo las horas
        await supabase.from('profiles').update({ 
            dni: formData.dni, 
            position: formData.position || null,
            daily_hours: hours 
        }).eq('id', newProfiles.id);

        if (formData.role === 'worker') {
          await supabase.from('worker_credentials').insert({ user_id: newProfiles.id, access_code: formData.password });
          setWorkerCredentials(prev => [...prev, { user_id: newProfiles.id, access_code: formData.password }]);
        }
      }
      toast({ title: 'Creado', description: 'Trabajador creado correctamente' });
    }
    loadProfiles();
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDeactivate = async (id: string) => {
    const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', id);
    if (error) { toast({ variant: 'destructive', title: 'Error', description: 'No se pudo desactivar' }); return; }
    loadProfiles();
    toast({ title: 'Desactivado', description: 'Trabajador movido a desactivados' });
  };

  const handleReactivate = async (profile: Profile) => {
    const { error } = await supabase.from('profiles').update({ is_active: true }).eq('id', profile.id);
    if (error) { toast({ variant: 'destructive', title: 'Error', description: 'No se pudo reactivar' }); return; }
    loadProfiles();
    toast({ title: 'Reactivado', description: 'Trabajador reactivado' });
  };

  // --- 🔥 FUNCIÓN CORREGIDA PARA ELIMINAR SIN ERRORES 🔥 ---
  const handlePermanentDelete = async (profile: Profile) => {
    try {
      // 1. Borrar fichajes
      const { error: timeError } = await supabase.from('time_entries').delete().eq('user_id', profile.id);
      if (timeError) throw timeError;

      // 2. Borrar incidentes (Forma segura)
      const { error: incidentError } = await supabase.from('incidents').delete().eq('user_id', profile.id);
      if (incidentError) console.log("Nota: Error no crítico borrando incidentes", incidentError);

      // 3. Borrar logs de auditoría
      const { error: auditError } = await supabase.from('audit_logs').delete().eq('user_id', profile.id);
      if (auditError) console.log("Nota: Error no crítico borrando auditoría", auditError);

      // 4. Borrar credenciales si es trabajador
      if (profile.role === 'worker') {
        const { error: credError } = await supabase.from('worker_credentials').delete().eq('user_id', profile.id);
        if (credError) throw credError;
      }

      // 5. Finalmente borrar el perfil
      const { error: profileError } = await supabase.from('profiles').delete().eq('id', profile.id);
      if (profileError) throw profileError;

      loadProfiles();
      toast({ title: 'Eliminado', description: 'Trabajador y datos eliminados permanentemente' });
    } catch (error: any) {
      console.error('Error eliminando:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Fallo al eliminar: ' + (error.message || 'Error desconocido') });
    }
  };

  const formatDate = (isoString: string) => new Date(isoString).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const toggleCodeVisibility = (userId: string) => setVisibleCodes(prev => ({ ...prev, [userId]: !prev[userId] }));
  const handleEditCode = (userId: string, currentCode: string) => { setEditingCodeId(userId); setEditingCodeValue(currentCode); };
  const handleCancelEditCode = () => { setEditingCodeId(null); setEditingCodeValue(''); };

  const handleSaveCode = async (userId: string) => {
    if (editingCodeValue.length !== 4 || !/^\d{4}$/.test(editingCodeValue)) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debe ser de 4 dígitos' }); return;
    }
    const existingCodes = workerCredentials.filter(c => c.user_id !== userId).map(c => c.access_code);
    if (existingCodes.includes(editingCodeValue)) {
      toast({ variant: 'destructive', title: 'Error', description: 'Clave en uso' }); return;
    }
    const { error } = await supabase.from('worker_credentials').update({ access_code: editingCodeValue }).eq('user_id', userId);
    if (error) { toast({ variant: 'destructive', title: 'Error', description: 'Error al actualizar' }); return; }
    toast({ title: 'Actualizado', description: 'Clave actualizada' });
    setEditingCodeId(null); setEditingCodeValue(''); loadData();
  };

  const handleRegenerateCode = async (userId: string) => {
    const newCode = await generateUniqueCode();
    const { error } = await supabase.from('worker_credentials').update({ access_code: newCode }).eq('user_id', userId);
    if (error) { toast({ variant: 'destructive', title: 'Error', description: 'Error al regenerar' }); return; }
    toast({ title: 'Regenerada', description: `Nueva clave: ${newCode}` }); loadData();
  };

  const activeProfiles = profiles.filter(p => p.is_active);
  const deactivatedProfiles = profiles.filter(p => !p.is_active);
  const currentProfiles = activeTab === 'active' ? activeProfiles : deactivatedProfiles;
  const filteredProfiles = currentProfiles.filter(p => 
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.dni && p.dni.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-primary rounded-full border-t-transparent"/></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestión de Trabajadores</h2>
          <p className="text-muted-foreground">Alta, baja y modificación de empleados</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => handleOpenDialog()}><Plus className="h-4 w-4" /> Nuevo Trabajador</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingProfile ? 'Editar Trabajador' : 'Nuevo Trabajador'}</DialogTitle>
              <DialogDescription>{editingProfile ? 'Modifique los datos' : 'Complete los datos de alta'}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="fullName">Nombre completo *</Label><Input id="fullName" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} placeholder="Nombre y apellidos" /></div>
              <div className="space-y-2"><Label htmlFor="dni">DNI/NIE *</Label><Input id="dni" value={formData.dni} onChange={(e) => setFormData({ ...formData, dni: e.target.value.toUpperCase() })} placeholder="12345678A" disabled={!!editingProfile} /></div>
              
              {/* CAMPO NUEVO: HORAS DE JORNADA */}
              <div className="space-y-2">
                <Label htmlFor="dailyHours">Horas Jornada Diaria (Contrato) *</Label>
                <div className="relative">
                    <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        id="dailyHours" 
                        type="number" 
                        min="1" 
                        max="24" 
                        step="0.5"
                        value={formData.dailyHours} 
                        onChange={(e) => setFormData({ ...formData, dailyHours: e.target.value })} 
                        className="pl-9"
                        placeholder="8" 
                    />
                </div>
                <p className="text-[10px] text-muted-foreground">Usado para calcular horas extra en el informe.</p>
              </div>

              {!editingProfile && (
                <div className="space-y-2">
                  <Label htmlFor="password">{formData.role === 'worker' ? 'Clave (4 dígitos) *' : 'Contraseña *'}</Label>
                  <div className="relative">
                     <Input id="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value.slice(0, 12) })} readOnly={formData.role === 'worker'} />
                     <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                  </div>
                  {formData.role === 'worker' && <Button type="button" variant="outline" size="sm" onClick={async () => setFormData({ ...formData, password: await generateUniqueCode() })} className="mt-1 w-full"><RefreshCw className="h-3 w-3 mr-2"/> Regenerar Clave</Button>}
                </div>
              )}
              <div className="space-y-2"><Label>Tipo de cuenta</Label><Select value={formData.role} onValueChange={async (val: UserRole) => setFormData({ ...formData, role: val, password: val === 'worker' ? await generateUniqueCode() : '' })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="worker">Trabajador</SelectItem><SelectItem value="admin">Administrador</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Puesto</Label><Input value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} /></div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit">Guardar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total</p><p className="text-3xl font-bold">{profiles.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Activos</p><p className="text-3xl font-bold text-success">{activeProfiles.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Desactivados</p><p className="text-3xl font-bold text-muted-foreground">{deactivatedProfiles.length}</p></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
        <TabsList><TabsTrigger value="active">Activos</TabsTrigger><TabsTrigger value="deactivated">Desactivados</TabsTrigger></TabsList>
        <div className="relative max-w-md my-4"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/><Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9"/></div>
        
        {['active', 'deactivated'].map((tabValue) => (
          <TabsContent key={tabValue} value={tabValue}>
            <Card>
              <CardContent className="p-0">
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>DNI</TableHead><TableHead>Clave</TableHead><TableHead>Jornada</TableHead><TableHead>Puesto</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filteredProfiles.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8">Sin resultados</TableCell></TableRow> : 
                        filteredProfiles.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.full_name}</TableCell>
                            <TableCell className="font-mono">{p.dni}</TableCell>
                            <TableCell>{p.role === 'worker' ? (visibleCodes[p.id] ? getWorkerAccessCode(p.id) : '••••') : 'N/A'} 
                              {p.role === 'worker' && <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => toggleCodeVisibility(p.id)}><Eye className="h-3 w-3"/></Button>}
                            </TableCell>
                            <TableCell><Badge variant="outline">{p.daily_hours || 8}h</Badge></TableCell>
                            <TableCell>{p.position}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <MonthlyReportDialog profile={p} />
                                {tabValue === 'active' ? (
                                  <>
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(p)}><Pencil className="h-4 w-4"/></Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><UserX className="h-4 w-4 text-destructive"/></Button></AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>¿Desactivar?</AlertDialogTitle></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>No</AlertDialogCancel><AlertDialogAction onClick={() => handleDeactivate(p.id)}>Sí, desactivar</AlertDialogAction></AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </>
                                ) : (
                                  <>
                                    <Button variant="outline" size="sm" onClick={() => handleReactivate(p)}><RotateCcw className="h-4 w-4 mr-1"/> Reactivar</Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-1"/> Eliminar</Button></AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>¿Eliminar permanentemente?</AlertDialogTitle><AlertDialogDescription>Se borrará TODO el historial.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>No</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={() => handlePermanentDelete(p)}>Sí, eliminar</AlertDialogAction></AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      }
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
