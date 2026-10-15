-- `supabase db lint` (plpgsql_check) evalúa un `execute` cuyo argumento es una cadena constante y
-- fallaba porque las seis columnas ya no existen cuando se llega acá. La función sólo hace algo en
-- una base que todavía las tiene (la guardia del principio); el SQL se arma en tiempo de ejecución
-- con `format()` para que el chequeo estático no lo trate como una sentencia fija.
create or replace function public._leads_columnas_a_atributos()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n int := 0;
  v_columnas constant text[] := array['edad', 'genero', 'ciudad', 'pais', 'direccion', 'notas'];
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'leads' and column_name = 'edad') then
    return 0;
  end if;
  drop view if exists public.leads_vista;
  alter table public.leads disable trigger trg_lead_version;
  alter table public.leads disable trigger trg_lead_auditar;
  execute format($q$
    update public.leads set atributos = atributos || jsonb_strip_nulls(jsonb_build_object(
      'edad', %1$I,
      'genero', nullif(%2$I::text, 'sin_especificar'),
      'ciudad', nullif(btrim(%3$I), ''),
      'pais', nullif(btrim(%4$I), ''),
      'direccion', nullif(btrim(%5$I), ''),
      'notas', nullif(btrim(%6$I), '')))
  $q$, v_columnas[1], v_columnas[2], v_columnas[3], v_columnas[4], v_columnas[5], v_columnas[6]);
  get diagnostics v_n = row_count;
  alter table public.leads enable trigger trg_lead_version;
  alter table public.leads enable trigger trg_lead_auditar;
  alter table public.leads drop column edad, drop column ciudad, drop column pais,
    drop column direccion, drop column genero, drop column notas;
  drop type if exists public.genero_persona;
  return v_n;
end;
$$;
revoke all on function public._leads_columnas_a_atributos() from public, anon, authenticated;
