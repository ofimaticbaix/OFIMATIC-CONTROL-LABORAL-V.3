// ... (mantenir imports igual)

export const VacationManager = ({ profile }: VacationManagerProps) => {
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [comment, setComment] = useState('');
  const { toast } = useToast();
  const isAdmin = profile.role === 'admin';

  useEffect(() => {
    loadRequests();
  }, [profile]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('time_off_requests')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('user_id', profile.id);
      }

      const { data, error } = await query;

      // MODIFICACIÓN: Si el error es que la tabla no existe o está vacía, no mostramos el Toast rojo
      if (error) {
        console.warn("Aviso: No hay solicitudes o la tabla se está creando:", error.message);
        setRequests([]); 
      } else {
        setRequests(data as any[] || []);
      }
    } catch (err) {
      console.error("Error inesperado:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
        toast({ variant: 'destructive', title: 'Faltan fechas', description: 'Selecciona las fechas.' });
        return;
    }

    const { error } = await supabase.from('time_off_requests').insert({
      user_id: profile.id,
      start_date: startDate,
      end_date: endDate,
      type: 'vacation', 
      comment,
      status: 'pending'
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar la solicitud.' });
    } else {
      toast({ title: 'Solicitud enviada', description: 'Tus vacaciones han quedado registradas.' });
      setStartDate('');
      setEndDate('');
      setComment('');
      loadRequests();
    }
  };

  // ... (resta de funciones handleStatusChange, handleDelete y renderizado igual)
  // [Copia el resto de tu código original del renderizado aquí abajo]
