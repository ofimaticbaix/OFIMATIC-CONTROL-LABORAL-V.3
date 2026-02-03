import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-for',
};

interface AuthRequest {
  dni?: string;
  accessCode: string;
  mode?: 'worker' | 'admin';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get client IP for audit logging
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    const { dni, accessCode, mode = 'worker' }: AuthRequest = await req.json();

    // Validate based on mode
    if (mode === 'admin') {
      if (!dni || !accessCode) {
        console.log('Missing DNI or password for admin login');
        return new Response(
          JSON.stringify({ error: 'Credenciales inválidas' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Worker mode - only needs access code
      if (!accessCode) {
        console.log('Missing access code for worker login');
        return new Response(
          JSON.stringify({ error: 'Introduce tu clave de acceso' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Normalize DNI if provided
    const normalizedDni = dni ? dni.toUpperCase().trim() : null;
    
    // Use DNI for rate limiting if admin, or access code for worker
    const rateLimitIdentifier = mode === 'admin' && normalizedDni ? normalizedDni : `worker_code_${accessCode}`;
    
    console.log(`Auth attempt - mode: ${mode}, identifier: ${rateLimitIdentifier.substring(0, 8)}***`);

    // Check rate limit using RPC function
    const { data: canAttempt, error: rateLimitError } = await supabaseAdmin
      .rpc('check_rate_limit', { p_identifier: rateLimitIdentifier });

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    }

    if (!canAttempt) {
      console.log('Rate limit exceeded');
      await supabaseAdmin.rpc('log_login_attempt', {
        p_dni: normalizedDni || 'WORKER_CODE',
        p_success: false,
        p_user_id: null,
        p_ip_address: clientIp,
      });
      return new Response(
        JSON.stringify({ error: 'Demasiados intentos. Por favor espera 15 minutos.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record this attempt for rate limiting
    await supabaseAdmin.rpc('record_login_attempt', { p_identifier: rateLimitIdentifier });

    // Always add a small delay to prevent timing attacks
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    let userInfo: { id: string; email: string; is_active: boolean; role: string } | null = null;
    let passwordToUse: string;

    if (mode === 'worker') {
      // Worker login: lookup by access code
      const { data: credData, error: credError } = await supabaseAdmin
        .from('worker_credentials')
        .select('user_id, access_code')
        .eq('access_code', accessCode)
        .single();

      if (credError || !credData) {
        await supabaseAdmin.rpc('log_login_attempt', {
          p_dni: 'WORKER_CODE',
          p_success: false,
          p_user_id: null,
          p_ip_address: clientIp,
        });
        console.log('Worker credentials not found for access code');
        return new Response(
          JSON.stringify({ error: 'Clave de acceso incorrecta' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user profile
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, is_active, role, dni')
        .eq('id', credData.user_id)
        .single();

      if (profileError || !profileData) {
        await supabaseAdmin.rpc('log_login_attempt', {
          p_dni: 'WORKER_CODE',
          p_success: false,
          p_user_id: null,
          p_ip_address: clientIp,
        });
        console.log('Profile not found for worker');
        return new Response(
          JSON.stringify({ error: 'Clave de acceso incorrecta' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!profileData.is_active) {
        await supabaseAdmin.rpc('log_login_attempt', {
          p_dni: profileData.dni || 'WORKER_CODE',
          p_success: false,
          p_user_id: null,
          p_ip_address: clientIp,
        });
        console.log('Inactive worker attempted login');
        return new Response(
          JSON.stringify({ error: 'Cuenta desactivada' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (profileData.role !== 'worker') {
        await supabaseAdmin.rpc('log_login_attempt', {
          p_dni: profileData.dni || 'WORKER_CODE',
          p_success: false,
          p_user_id: null,
          p_ip_address: clientIp,
        });
        console.log('Non-worker tried to use worker login');
        return new Response(
          JSON.stringify({ error: 'Use el acceso de administrador' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userInfo = profileData;
      // Workers use the compound password format
      passwordToUse = `worker_${accessCode}_${profileData.dni}`;

    } else {
      // Admin login: lookup by DNI
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, is_active, role')
        .eq('dni', normalizedDni!)
        .single();

      if (profileError || !profileData) {
        await supabaseAdmin.rpc('log_login_attempt', {
          p_dni: normalizedDni!,
          p_success: false,
          p_user_id: null,
          p_ip_address: clientIp,
        });
        console.log('Admin DNI lookup failed');
        return new Response(
          JSON.stringify({ error: 'Credenciales inválidas' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!profileData.is_active) {
        await supabaseAdmin.rpc('log_login_attempt', {
          p_dni: normalizedDni!,
          p_success: false,
          p_user_id: null,
          p_ip_address: clientIp,
        });
        console.log('Inactive admin attempted login');
        return new Response(
          JSON.stringify({ error: 'Cuenta desactivada' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (profileData.role !== 'admin') {
        await supabaseAdmin.rpc('log_login_attempt', {
          p_dni: normalizedDni!,
          p_success: false,
          p_user_id: null,
          p_ip_address: clientIp,
        });
        console.log('Non-admin tried to use admin login');
        return new Response(
          JSON.stringify({ error: 'Use el acceso de trabajador' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userInfo = profileData;
      // Admins use their password directly
      passwordToUse = accessCode;
    }

    // Attempt authentication with Auth
    let { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: userInfo.email,
      password: passwordToUse,
    });

    // Self-heal for workers: if access_code exists but Auth password is out of sync,
    // update the user's password to the expected compound format and retry once.
    if ((authError || !authData.session) && mode === 'worker' && userInfo?.id) {
      console.log('Worker auth failed; attempting password sync and retry');

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userInfo.id, {
        password: passwordToUse,
      });

      if (updateError) {
        console.error('Failed to sync worker password:', updateError);
      } else {
        // Small delay to avoid eventual-consistency edge cases
        await new Promise(resolve => setTimeout(resolve, 150));

        const retry = await supabaseAdmin.auth.signInWithPassword({
          email: userInfo.email,
          password: passwordToUse,
        });
        authData = retry.data;
        authError = retry.error;
      }
    }

    if (authError || !authData.session) {
      await supabaseAdmin.rpc('log_login_attempt', {
        p_dni: normalizedDni || 'WORKER_CODE',
        p_success: false,
        p_user_id: null,
        p_ip_address: clientIp,
      });
      console.log('Auth failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: mode === 'worker' ? 'Clave de acceso incorrecta' : 'Credenciales inválidas' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log successful login
    await supabaseAdmin.rpc('log_login_attempt', {
      p_dni: normalizedDni || 'WORKER_CODE',
      p_success: true,
      p_user_id: authData.user.id,
      p_ip_address: clientIp,
    });

    console.log('Auth successful for user:', authData.user.id);

    // Return session tokens
    return new Response(
      JSON.stringify({
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_in: authData.session.expires_in,
        token_type: authData.session.token_type,
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Error del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
