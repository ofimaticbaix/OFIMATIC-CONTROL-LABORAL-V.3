import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SeedAdminRequest {
  email: string;
  password: string;
  fullName: string;
  dni: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { email, password, fullName, dni }: SeedAdminRequest = await req.json();

    console.log('Seed admin request received for email:', email);

    // Validate required fields
    if (!email || !password || !fullName || !dni) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Todos los campos son obligatorios: email, password, fullName, dni' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate password strength (minimum 12 characters)
    if (password.length < 12) {
      console.error('Password too short');
      return new Response(
        JSON.stringify({ error: 'La contraseña debe tener al menos 12 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if any admin already exists
    const { data: existingAdmins, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1);

    if (checkError) {
      console.error('Error checking existing admins:', checkError);
      return new Response(
        JSON.stringify({ error: 'Error al verificar administradores existentes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingAdmins && existingAdmins.length > 0) {
      console.log('Admin already exists, rejecting request');
      return new Response(
        JSON.stringify({ error: 'Ya existe un administrador. Use el panel de trabajadores para crear más.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if DNI is already in use
    const { data: existingDni } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('dni', dni.toUpperCase().trim())
      .limit(1);

    if (existingDni && existingDni.length > 0) {
      console.error('DNI already in use');
      return new Response(
        JSON.stringify({ error: 'Este DNI ya está registrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating admin user...');

    // Create the auth user with admin role in metadata
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        role: 'admin',
      },
    });

    if (createError) {
      console.error('Error creating auth user:', createError);
      let message = createError.message;
      if (message.includes('already been registered')) {
        message = 'Este email ya está registrado';
      }
      return new Response(
        JSON.stringify({ error: message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authData.user) {
      console.error('No user returned from createUser');
      return new Response(
        JSON.stringify({ error: 'Error al crear usuario' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Auth user created, ID:', authData.user.id);

    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update the profile with DNI (trigger should have created it with admin role)
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        dni: dni.toUpperCase().trim(),
        role: 'admin', // Ensure admin role is set
      })
      .eq('id', authData.user.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      // Don't fail the whole operation, the user was created
    }

    console.log('Admin user created successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Administrador ${fullName} creado correctamente. Ya puedes iniciar sesión con tu DNI.`,
        userId: authData.user.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Error inesperado del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
