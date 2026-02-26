import { useState, useEffect } from 'react';
import { Users, UserPlus, Search, Loader2, Shield, Trash2, ShieldAlert, Pencil, KeyRound, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Worker {
  id: string;
  full_name: string;
  email: string;
  dni: string;
  department: string | null;
  position: string | null;
  role: string;
  is_active: boolean;
  weekly_hours: number | null;
  daily_hours: number | null;
  work_day_type: string | null;
  access_code?: string;
}

export const WorkersView = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Diálogo de Nuevo Alta
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newPin, setNewPin] = useState<string | null>(null);
  const [pinCopied, setPinCopied] = useState(false);
  const [newForm, setNewForm] = useState({
    full_name: '',
    email: '',
    dni: '',
    department: '',
    position: '',
    weekly_hours: '40',
    daily_hours: '8',
    work_day_type: 'full',
  });

  // Diálogo de Editar
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editWorker, setEditWorker] = useState<Worker | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    dni: '',
    department: '',
    position: '',
    weekly_hours: '',
    daily_hours: '',
    work_day_type: '',
    access_code: '',
  });
  const [showPin, setShowPin] = useState(false);

  // Diálogo de Eliminar
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteWorker, setDeleteWorker] = useState<Worker | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { loadWorkers(); }, []);

  const loadWorkers = async () => {
    setLoading(true);
    try {
      // Cargar perfiles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;

      // Cargar credenciales (PINs)
      const { data: credentials } = await supabase
        .from('worker_credentials')
        .select('user_id, access_code');

      // Combinar datos
      const combined = (profiles || []).map(p => ({
        ...p,
        access_code: credentials?.find(c => c.user_id === p.id)?.access_code || '',
      }));

      setWorkers(combined);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error de Datos',
        description: 'No se pudieron cargar los trabajadores.'
      });
    } finally {
      setLoading(false);
    }
  };

  // ========================
  // CREAR NUEVO TRABAJADOR
  // ========================
  const handleCreate = async () => {
    if (!newForm.full_name || !newForm.email || !newForm.dni) {
      toast({ variant: 'destructive', title: 'Campos obligatorios', description: 'Nombre, email y DNI son obligatorios.' });
      return;
    }

    setIsCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-worker`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            full_name: newForm.full_name,
            email: newForm.email,
            dni: newForm.dni,
            department: newForm.department || null,
            position: newForm.position || null,
            weekly_hours: parseFloat(newForm.weekly_hours) || 40,
            daily_hours: parseFloat(newForm.daily_hours) || 8,
            work_day_type: newForm.work_day_type || 'full',
          }),
        }
      );

      const result = await res.json();

      if (!res.ok || result.error) {
        throw new Error(result.error || 'Error desconocido');
      }

      setNewPin(result.pin);
      toast({ title: '¡Trabajador creado!', description: `PIN de acceso: ${result.pin}` });
      loadWorkers();

    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsCreating(false);
    }
  };

  const resetNewForm = () => {
    setNewForm({ full_name: '', email: '', dni: '', department: '', position: '', weekly_hours: '40', daily_hours: '8', work_day_type: 'full' });
    setNewPin(null);
    setPinCopied(false);
  };

  const copyPin = () => {
    if (newPin) {
      navigator.clipboard.writeText(newPin);
      setPinCopied(true);
      setTimeout(() => setPinCopied(false), 2000);
    }
  };

  // ========================
  // EDITAR TRABAJADOR
  // ========================
  const openEdit = (worker: Worker) => {
    setEditWorker(worker);
    setEditForm({
      full_name: worker.full_name || '',
      email: worker.email || '',
      dni: worker.dni || '',
      department: worker.department || '',
      position: worker.position || '',
      weekly_hours: String(worker.weekly_hours || ''),
      daily_hours: String(worker.daily_hours || ''),
      work_day_type: worker.work_day_type || 'full',
      access_code: worker.access_code || '',
    });
    setShowPin(false);
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editWorker) return;
    setIsUpdating(true);

    try {
      // Actualizar perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          dni: editForm.dni,
          department: editForm.department || null,
          position: editForm.position || null,
          weekly_hours: parseFloat(editForm.weekly_hours) || null,
          daily_hours: parseFloat(editForm.daily_hours) || null,
          work_day_type: editForm.work_day_type || null,
        })
        .eq('id', editWorker.id);

      if (profileError) throw profileError;

      // Actualizar PIN si cambió
      if (editForm.access_code && editForm.access_code !== editWorker.access_code) {
        if (editForm.access_code.length !== 4 || !/^\d{4}$/.test(editForm.access_code)) {
          toast({ variant: 'destructive', title: 'PIN inválido', description: 'El PIN debe ser exactamente 4 dígitos.' });
          setIsUpdating(false);
          return;
        }

        const { error: credError } = await supabase
          .from('worker_credentials')
          .update({ access_code: editForm.access_code })
          .eq('user_id', editWorker.id);

        if (credError) throw credError;
      }

      toast({ title: 'Actualizado', description: `Ficha de ${editForm.full_name} actualizada.` });
      setIsEditOpen(false);
      loadWorkers();

    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  // ========================
  // ELIMINAR TRABAJADOR
  // ========================
  const handleDelete = async () => {
    if (!deleteWorker) return;
    setIsDeleting(true);

    try {
      // Borrar credenciales
      await supabase.from('worker_credentials').delete().eq('user_id', deleteWorker.id);
      
      // Borrar perfil (cascade borrará punches y time_entries)
      const { error } = await supabase.from('profiles').delete().eq('id', deleteWorker.id);
      if (error) throw error;

      toast({ title: 'Eliminado', description: `${deleteWorker.full_name} ha sido dado de baja.` });
      setIsDeleteOpen(false);
      setDeleteWorker(null);
      loadWorkers();

    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredWorkers = workers.filter(w =>
    (w.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (w.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (w.dni?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="h-[50vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin h-10 w-10 text-blue-500/30" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Accediendo a la plantilla...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">

      {/* HEADER */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between px-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Users className="h-7 w-7 text-blue-500" />
            Trabajadores
          </h2>
          <p className="text-sm text-slate-500 font-medium uppercase tracking-widest">Control de accesos y perfiles</p>
        </div>

        <div className="flex gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar empleado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 pl-11 rounded-2xl border-white/40 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-sm w-64"
            />
          </div>
          <Button
            onClick={() => { resetNewForm(); setIsNewOpen(true); }}
            className="h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-lg shadow-blue-500/20 gap-2"
          >
            <UserPlus className="h-4 w-4" /> Nuevo Alta
          </Button>
        </div>
      </div>

      {/* TABLA */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-800 shadow-2xl">
        {workers.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center text-center space-y-4">
            <ShieldAlert className="h-12 w-12 text-orange-400 opacity-40" />
            <p className="text-sm font-bold text-slate-400">No hay trabajadores registrados</p>
            <Button onClick={() => { resetNewForm(); setIsNewOpen(true); }} className="rounded-full">
              <UserPlus className="h-4 w-4 mr-2" /> Crear primer trabajador
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-b border-slate-100 dark:border-slate-800">
                  <TableHead className="py-5 pl-8 text-[10px] font-bold uppercase tracking-widest text-slate-500">Nombre</TableHead>
                  <TableHead className="py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Email</TableHead>
                  <TableHead className="py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500">DNI</TableHead>
                  <TableHead className="py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Rol</TableHead>
                  <TableHead className="py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500">PIN</TableHead>
                  <TableHead className="py-5 pr-8 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkers.map((worker) => (
                  <TableRow key={worker.id} className="group border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-blue-50/30 transition-all duration-300">
                    <TableCell className="py-5 pl-8 font-bold text-slate-700 dark:text-slate-200">{worker.full_name}</TableCell>
                    <TableCell className="py-5 text-slate-500 text-xs">{worker.email}</TableCell>
                    <TableCell className="py-5 text-slate-500 text-xs font-mono">{worker.dni}</TableCell>
                    <TableCell className="py-5">
                      <span className={cn(
                        "inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-bold uppercase border",
                        worker.role === 'admin' ? "bg-purple-50 text-purple-600 border-purple-100" : "bg-slate-50 text-slate-600 border-slate-200"
                      )}>
                        <Shield className="h-3 w-3 mr-1" /> {worker.role}
                      </span>
                    </TableCell>
                    <TableCell className="py-5">
                      {worker.access_code ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <KeyRound className="h-3 w-3 mr-1.5" /> {worker.access_code}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-5 pr-8 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(worker)} className="opacity-0 group-hover:opacity-100 hover:text-blue-500 transition-all" title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {worker.role !== 'admin' && (
                          <Button variant="ghost" size="icon" onClick={() => { setDeleteWorker(worker); setIsDeleteOpen(true); }} className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all" title="Eliminar">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ================================ */}
      {/* DIÁLOGO: NUEVO ALTA              */}
      {/* ================================ */}
      <Dialog open={isNewOpen} onOpenChange={(open) => { if (!open) resetNewForm(); setIsNewOpen(open); }}>
        <DialogContent className="sm:max-w-lg rounded-[2rem] bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-center">
              {newPin ? '¡Trabajador Creado!' : 'Nuevo Alta de Trabajador'}
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-500">
              {newPin ? 'Guarda el PIN de acceso del trabajador.' : 'Completa los datos del nuevo empleado.'}
            </DialogDescription>
          </DialogHeader>

          {newPin ? (
            /* PANTALLA DE ÉXITO CON PIN */
            <div className="flex flex-col items-center gap-6 py-6">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-2xl p-8 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">PIN de Acceso</p>
                <p className="text-5xl font-black tracking-[0.5em] text-emerald-700 dark:text-emerald-400 font-mono">{newPin}</p>
              </div>
              <Button onClick={copyPin} variant="outline" className="rounded-full gap-2 font-bold">
                {pinCopied ? <><Check className="h-4 w-4 text-emerald-500" /> Copiado</> : <><Copy className="h-4 w-4" /> Copiar PIN</>}
              </Button>
              <p className="text-[10px] text-slate-400 text-center max-w-xs">
                Este PIN es necesario para que el trabajador acceda al sistema de fichaje. Comunícaselo de forma segura.
              </p>
              <DialogFooter className="w-full">
                <Button onClick={() => { resetNewForm(); setIsNewOpen(false); }} className="w-full rounded-xl h-12 font-bold">
                  Cerrar
                </Button>
              </DialogFooter>
            </div>
          ) : (
            /* FORMULARIO DE ALTA */
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 ml-1">Nombre completo *</Label>
                  <Input value={newForm.full_name} onChange={(e) => setNewForm({ ...newForm, full_name: e.target.value })} placeholder="Juan García López" className="rounded-xl h-12" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 ml-1">Email *</Label>
                  <Input type="email" value={newForm.email} onChange={(e) => setNewForm({ ...newForm, email: e.target.value })} placeholder="juan@empresa.com" className="rounded-xl h-12" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 ml-1">DNI *</Label>
                  <Input value={newForm.dni} onChange={(e) => setNewForm({ ...newForm, dni: e.target.value })} placeholder="12345678A" className="rounded-xl h-12" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 ml-1">Departamento</Label>
                  <Input value={newForm.department} onChange={(e) => setNewForm({ ...newForm, department: e.target.value })} placeholder="Administración" className="rounded-xl h-12" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 ml-1">Puesto</Label>
                  <Input value={newForm.position} onChange={(e) => setNewForm({ ...newForm, position: e.target.value })} placeholder="Técnico" className="rounded-xl h-12" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 ml-1">Horas/semana</Label>
                  <Input type="number" value={newForm.weekly_hours} onChange={(e) => setNewForm({ ...newForm, weekly_hours: e.target.value })} className="rounded-xl h-12" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 ml-1">Horas/día</Label>
                  <Input type="number" value={newForm.daily_hours} onChange={(e) => setNewForm({ ...newForm, daily_hours: e.target.value })} className="rounded-xl h-12" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 ml-1">Tipo de jornada</Label>
                  <Select value={newForm.work_day_type} onValueChange={(v) => setNewForm({ ...newForm, work_day_type: v })}>
                    <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="full">Jornada completa</SelectItem>
                      <SelectItem value="half">Media jornada</SelectItem>
                      <SelectItem value="partial">Jornada parcial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800">
                <p className="text-[10px] text-blue-700 dark:text-blue-400 font-bold text-center">
                  🔑 Se generará un PIN de 4 dígitos automáticamente al crear el trabajador.
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button onClick={handleCreate} disabled={isCreating} className="w-full rounded-xl h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold">
                  {isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Crear Trabajador'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ================================ */}
      {/* DIÁLOGO: EDITAR TRABAJADOR       */}
      {/* ================================ */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg rounded-[2rem] bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-center">Editar Trabajador</DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-500">Modifica los datos del empleado.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 ml-1">Nombre completo</Label>
                <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="rounded-xl h-12" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 ml-1">Email (no editable)</Label>
                <Input value={editForm.email} disabled className="rounded-xl h-12 opacity-50" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 ml-1">DNI</Label>
                <Input value={editForm.dni} onChange={(e) => setEditForm({ ...editForm, dni: e.target.value })} className="rounded-xl h-12" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 ml-1">Departamento</Label>
                <Input value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} className="rounded-xl h-12" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 ml-1">Puesto</Label>
                <Input value={editForm.position} onChange={(e) => setEditForm({ ...editForm, position: e.target.value })} className="rounded-xl h-12" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 ml-1">Horas/semana</Label>
                <Input type="number" value={editForm.weekly_hours} onChange={(e) => setEditForm({ ...editForm, weekly_hours: e.target.value })} className="rounded-xl h-12" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 ml-1">Horas/día</Label>
                <Input type="number" value={editForm.daily_hours} onChange={(e) => setEditForm({ ...editForm, daily_hours: e.target.value })} className="rounded-xl h-12" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 ml-1">Tipo de jornada</Label>
                <Select value={editForm.work_day_type} onValueChange={(v) => setEditForm({ ...editForm, work_day_type: v })}>
                  <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="full">Jornada completa</SelectItem>
                    <SelectItem value="half">Media jornada</SelectItem>
                    <SelectItem value="partial">Jornada parcial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* PIN EDITABLE */}
            {editWorker?.role !== 'admin' && (
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-amber-700 ml-1 flex items-center gap-1.5">
                  <KeyRound className="h-3 w-3" /> PIN de Acceso
                </Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    type={showPin ? 'text' : 'password'}
                    value={editForm.access_code}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setEditForm({ ...editForm, access_code: val });
                    }}
                    maxLength={4}
                    placeholder="0000"
                    className="rounded-xl h-12 font-mono text-xl tracking-[0.5em] text-center font-bold"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => setShowPin(!showPin)} className="h-12 w-12 rounded-xl">
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-[9px] text-amber-600 mt-2">Cambia el PIN solo si es necesario. Debe tener 4 dígitos.</p>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button onClick={handleUpdate} disabled={isUpdating} className="w-full rounded-xl h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold">
                {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================================ */}
      {/* DIÁLOGO: CONFIRMAR ELIMINACIÓN   */}
      {/* ================================ */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">¿Dar de baja a {deleteWorker?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Esta acción eliminará el perfil, credenciales y registros asociados. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 sm:justify-center">
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sí, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
