const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSaving(true);
  
  try {
    // Generamos datos técnicos únicos basados en el DNI
    const userEmail = `${formData.dni.toLowerCase()}@ofimatic.com`;
    const technicalPassword = `worker_${formData.password}_${formData.dni}`;

    if (editingProfile) {
      // ACTUALIZACIÓN DE TRABAJADOR EXISTENTE
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          dni: formData.dni,
          position: formData.position,
          work_day_type: formData.workDayType,
          daily_hours: parseFloat(formData.dailyHours)
        })
        .eq('id', editingProfile.id);

      if (profileError) throw profileError;

      const { error: credError } = await supabase
        .from('worker_credentials')
        .update({ access_code: formData.password })
        .eq('user_id', editingProfile.id);

      if (credError) throw credError;

      toast({ title: 'Actualizado', description: 'Cambios guardados correctamente.' });
    } else {
      // NUEVO ALTA INTEGRAL (Auth + Profile + Credentials)
      // Paso 1: Crear en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userEmail,
        password: technicalPassword,
        options: {
          data: {
            full_name: formData.fullName,
            role: 'worker'
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No se recibió respuesta del servidor de autenticación.");

      // Paso 2: Crear Perfil vinculado
      const { error: profileInsertError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        full_name: formData.fullName,
        dni: formData.dni,
        position: formData.position,
        role: 'worker',
        email: userEmail,
        work_day_type: formData.workDayType,
        daily_hours: parseFloat(formData.dailyHours)
      });

      if (profileInsertError) throw profileInsertError;

      // Paso 3: Crear PIN de acceso
      const { error: credInsertError } = await supabase.from('worker_credentials').insert({
        user_id: authData.user.id,
        access_code: formData.password
      });

      if (credInsertError) throw credInsertError;

      toast({ title: '¡Éxito!', description: 'Trabajador registrado en todas las tablas.' });
    }

    await loadData();
    setIsDialogOpen(false);
  } catch (err: any) {
    console.error("Error detallado:", err);
    toast({ 
      variant: 'destructive', 
      title: 'Error de Guardado', 
      description: err.message || 'Error en la base de datos.' 
    });
  } finally {
    setIsSaving(false);
  }
};
