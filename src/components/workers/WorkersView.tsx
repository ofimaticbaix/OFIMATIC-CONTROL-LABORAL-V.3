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
      const { data: p, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      
      if (profilesError) throw profilesError;

      const { data: c, error: credsError } = await supabase
        .from('worker_credentials')
        .select('*');
      
      if (credsError) throw credsError;

      setProfiles(p || []);
      setWorkerCredentials(c || []);
    } catch (err: any) {
      console.error('Error cargando datos:', err);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: `No se pudieron cargar los datos: ${err.message}` 
      });
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
        fullName: '', 
        dni: '', 
        position: '', 
        role: 'worker', 
        workDayType: 'Estándar', 
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
      const cleanDni = formData.dni.trim().toUpperCase();
      const userEmail = `${cleanDni.toLowerCase()}@ofimatic.com`;
      const technicalPassword = `worker_${formData.password}_${cleanDni}`;

      let userId = editingProfile?.id;

      if (!editingProfile) {
        // 🆕 NUEVA ALTA - El trigger creará el perfil automáticamente
        console.log('🔄 Iniciando creación de usuario...');
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userEmail,
          password: technicalPassword,
          options: {
            data: {
              full_name: formData.fullName,
              role: formData.role,
              dni: cleanDni,
              position: formData.position,
              work_day_type: formData.workDayType,
              daily_hours: formData.dailyHours
            }
          }
        });

        if (authError) {
          if (authError.message?.includes('User already registered')) {
            throw new Error('Este DNI ya está registrado. Ve a Authentication en Supabase y elimina el usuario duplicado, o edita el trabajador existente.');
          }
          throw authError;
        }

        userId = authData.user?.id;
        if (!userId) throw new Error("No se pudo obtener el ID del usuario creado");

        console.log('✅ Usuario creado en Auth:', userId);

        // ⏳ Esperar a que el trigger procese (importante)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verificar que el perfil se creó
        console.log('🔍 Verificando creación del perfil...');
        const { data: checkProfile, error: checkError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', userId)
          .single();

        if (checkError || !checkProfile) {
          console.error('❌ El perfil NO se creó automáticamente');
          console.error('Error del check:', checkError);
          
          // Fallback: Si el trigger falló, lo creamos manualmente
          console.log('🔧 Intentando crear perfil manualmente...');
          const { error: manualProfileError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              full_name: formData.fullName,
              dni: cleanDni,
              position: formData.position,
              role: formData.role,
              email: userEmail,
              work_day_type: formData.workDayType,
              daily_hours: parseFloat(formData.dailyHours)
            });

          if (manualProfileError) {
            console.error('❌ Error creando perfil manualmente:', manualProfileError);
            throw new Error(`No se pudo crear el perfil: ${manualProfileError.message}`);
          }
          console.log('✅ Perfil creado manualmente');
        } else {
          console.log('✅ Perfil creado por trigger:', checkProfile);
        }

        // 🔑 Crear credenciales (esto NO lo hace el trigger)
        console.log('🔑 Creando credenciales...');
        const { error: credsError } = await supabase
          .from('worker_credentials')
          .insert({
            user_id: userId,
            access_code: formData.password
          });

        if (credsError) {
          console.error('❌ Error creando credenciales:', credsError);
          throw new Error(`Error al crear credenciales: ${credsError.message}`);
        }

        console.log('✅ Credenciales creadas correctamente');

      } else {
        // ✏️ EDICIÓN: Actualizamos perfil existente
        console.log('📝 Actualizando trabajador existente...');
        
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
          .eq('id', userId);

        if (profileError) {
          console.error('❌ Error actualizando perfil:', profileError);
          throw new Error(`Error al actualizar: ${profileError.message}`);
        }

        // Upsert de credenciales (crear o actualizar)
        const { error: credsError } = await supabase
          .from('worker_credentials')
          .upsert({
            user_id: userId,
            access_code: formData.password
          });

        if (credsError) {
          console.error('❌ Error actualizando credenciales:', credsError);
          throw new Error(`Error al actualizar credenciales: ${credsError.message}`);
        }

        console.log('✅ Trabajador actualizado correctamente');
      }

      toast({ 
        title: '✅ Éxito', 
        description: editingProfile 
          ? 'Trabajador actualizado correctamente' 
          : 'Nuevo trabajador creado con éxito' 
      });
      
      await loadData();
      setIsDialogOpen(false);
      
    } catch (err: any) {
      console.error('❌ Error completo al guardar:', err);
      
      // 🔍 Mensajes de error mejorados
      let errorMsg = err.message || 'Error desconocido';
      
      if (err.message?.includes('duplicate key')) {
        errorMsg = 'Este DNI ya está registrado en el sistema. Usa el botón "Editar" en su ficha.';
      } else if (err.message?.includes('already registered')) {
        errorMsg = 'El email ya está registrado. Elimina el usuario en Authentication de Supabase.';
      } else if (err.message?.includes('violates')) {
        errorMsg = 'Error de base de datos. Verifica que las políticas RLS estén configuradas correctamente.';
      }
      
      toast({ 
        variant: 'destructive', 
        title: 'Error al guardar', 
        description: errorMsg 
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-20 text-center">
        <Loader2 className="animate-spin mx-auto h-10 w-10 text-primary" />
        <p className="mt-4 text-sm text-muted-foreground font-bold uppercase">Cargando trabajadores...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans text-foreground">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black uppercase italic tracking-tighter">
          Gestión de Trabajadores
        </h2>
        <Button 
          onClick={() => handleOpenDialog()} 
          className="bg-primary text-primary-foreground font-bold uppercase text-[10px] px-6"
        >
          <Plus className="h-4 w-4 mr-2" /> 
          Nuevo Alta
        </Button>
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] h-12">
                Nombre
              </TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] h-12">
                PIN
              </TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] h-12">
                Puesto / Jornada
              </TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] h-12 text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  <p className="font-bold uppercase text-sm">No hay trabajadores registrados</p>
                  <p className="text-xs mt-2">Haz clic en "Nuevo Alta" para comenzar</p>
                </TableCell>
              </TableRow>
            ) : (
              profiles.map((p) => {
                const pin = workerCredentials.find(c => c.user_id === p.id)?.access_code || '----';
                return (
                  <TableRow 
                    key={p.id} 
                    className="transition-colors border-b last:border-0 hover:bg-muted/30"
                  >
                    <TableCell className="font-bold py-5">
                      <div className="flex flex-col">
                        <span>{p.full_name}</span>
                        {p.role === 'admin' && (
                          <span className="text-[8px] text-primary font-black uppercase tracking-widest">
                            Administrador Ofimatic
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md border w-fit">
                        <span className="font-mono font-bold text-primary text-sm">
                          {visibleCodes[p.id] ? pin : '••••'}
                        </span>
                        <button 
                          onClick={() => setVisibleCodes(prev => ({...prev, [p.id]: !prev[p.id]}))}
                          className="hover:opacity-70 transition-opacity"
                        >
                          {visibleCodes[p.id] ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-[10px] font-bold uppercase space-y-0.5">
                        <p className="opacity-80">{p.position || '---'}</p>
                        <p className="text-muted-foreground">
                          {p.work_day_type === 'Estándar' 
                            ? `⏱️ ${p.daily_hours}h/día` 
                            : '📅 Personalizada'
                          }
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-3 items-center">
                        <MonthlyReportDialog profile={p} />
                        <button 
                          onClick={() => handleOpenDialog(p)} 
                          className="text-muted-foreground hover:text-foreground p-2 rounded-full transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black uppercase italic text-xl tracking-tight text-foreground">
              {editingProfile ? 'Editar Trabajador' : 'Nuevo Trabajador'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6 pt-4 text-foreground">
            {/* Datos Personales */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase opacity-70">
                  Nombre Completo *
                </Label>
                <Input 
                  required 
                  value={formData.fullName} 
                  onChange={e => setFormData({...formData, fullName: e.target.value})} 
                  className="bg-muted/30"
                  placeholder="Ej: Juan Pérez García" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase opacity-70">
                  DNI / NIE *
                </Label>
                <Input 
                  required 
                  value={formData.dni} 
                  onChange={e => setFormData({...formData, dni: e.target.value.toUpperCase()})} 
                  className="bg-muted/30"
                  placeholder="12345678A"
                  maxLength={9}
                />
              </div>
            </div>

            {/* Puesto y Rol */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase opacity-70">
                  Puesto
                </Label>
                <Input 
                  value={formData.position} 
                  onChange={e => setFormData({...formData, position: e.target.value})} 
                  className="bg-muted/30"
                  placeholder="Ej: Desarrollador" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase opacity-70">
                  Tipo de Cuenta *
                </Label>
                <Select 
                  value={formData.role} 
                  onValueChange={v => setFormData({...formData, role: v})}
                >
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    <SelectItem value="worker">Trabajador</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* PIN de Acceso */}
            <div className="p-5 bg-primary/5 border border-primary/20 rounded-lg">
              <Label className="text-[10px] font-black uppercase text-primary">
                PIN de Acceso (4 dígitos) *
              </Label>
              <Input 
                required 
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                className="bg-transparent border-none text-3xl font-mono font-black tracking-widest p-0 h-auto focus-visible:ring-0" 
                maxLength={4}
                pattern="[0-9]{4}"
                inputMode="numeric"
                placeholder="0000"
              />
              <p className="text-[9px] text-muted-foreground mt-2 uppercase font-bold">
                Este PIN será usado para fichar
              </p>
            </div>

            {/* Configuración de Jornada */}
            <div className="space-y-4 border-t pt-5">
              <Label className="text-[10px] font-black uppercase opacity-70">
                Configuración de la Jornada
              </Label>
              <Select 
                value={formData.workDayType} 
                onValueChange={v => setFormData({...formData, workDayType: v})}
              >
                <SelectTrigger className="bg-muted/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border">
                  <SelectItem value="Estándar">Jornada Estándar (L-V)</SelectItem>
                  <SelectItem value="Personalizada">Jornada Personalizada</SelectItem>
                </SelectContent>
              </Select>

              {formData.workDayType === 'Estándar' ? (
                <div className="flex items-center gap-4 bg-muted/20 p-5 rounded-lg border animate-in fade-in duration-300">
                  <Clock className="text-primary h-5 w-5" />
                  <div className="flex-1">
                    <Label className="text-[10px] font-bold uppercase opacity-70">
                      Horas diarias estimadas
                    </Label>
                    <Input 
                      type="number" 
                      step="0.5" 
                      min="0"
                      max="24"
                      value={formData.dailyHours} 
                      onChange={e => setFormData({...formData, dailyHours: e.target.value})} 
                      className="bg-transparent border-none text-2xl font-black p-0 h-auto focus-visible:ring-0" 
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-muted/10 p-5 rounded-lg border animate-in slide-in-from-top-2">
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map((day) => (
                    <div 
                      key={day} 
                      className="flex items-center justify-between border-b border-foreground/5 pb-2 last:border-0"
                    >
                      <span className="text-[10px] font-bold uppercase opacity-60 w-20">
                        {day}
                      </span>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="time" 
                          className="bg-background h-8 text-[11px] font-bold w-24 px-2" 
                          defaultValue="09:00" 
                        />
                        <span className="opacity-30">→</span>
                        <Input 
                          type="time" 
                          className="bg-background h-8 text-[11px] font-bold w-24 px-2" 
                          defaultValue="18:00" 
                        />
                      </div>
                    </div>
                  ))}
                  <p className="text-[9px] text-muted-foreground mt-3 uppercase font-bold">
                    ⚠️ Funcionalidad en desarrollo - Próximamente
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button 
                type="submit" 
                disabled={isSaving} 
                className="w-full bg-primary font-black uppercase tracking-widest h-12 shadow-lg hover:bg-primary/90 transition-all"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Guardando...
                  </>
                ) : (
                  editingProfile ? 'Actualizar Trabajador' : 'Crear Trabajador'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
