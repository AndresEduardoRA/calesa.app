-- Actividad: la app ya no ejecuta `registrar_actividad()` (paso 9.01-2, la deuda aceptada de la base). Con el execute, cualquiera con sesión
-- podía dejar filas de actividad con `antes`/`despues` inventados, que `actividad_diff()` (9.01-1) mostraría como un cambio real. Todas las
-- funciones que la llaman son `security definer` (corren como su dueño y no necesitan el grant) y nada de la app ni de las funciones edge la
-- llama por RPC. service_role la conserva. `supabase/tests/areas/actividad/registrar.sql` vigila que ninguna función de invocador la llame.

revoke execute on function public.registrar_actividad(text, text, text, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.registrar_actividad(text, text, text, jsonb, jsonb, jsonb) to service_role;

comment on function public.registrar_actividad(text, text, text, jsonb, jsonb, jsonb) is
  'Deja una fila en actividad con el actor de la sesión. Sólo la llaman funciones security definer (corren como su dueño): la app no la ejecuta desde 9.01-2. Una función invocadora que la llame fallaría con 42501: areas/actividad/registrar.sql lo vigila.';
