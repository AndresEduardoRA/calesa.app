-- Los ajustes de cotización de la empresa (paso 4.20-4a): la vigencia (D1) y el vehículo obligatorio al cotizar (D3), las dos columnas de
-- `ajustes_empresa` que valen para todas las cotizaciones. Las cambia esta RPC con `cotizaciones.configurar` concedida en todos los orígenes
-- (sin origen: `tiene_permiso()` aceptaría la clave en cualquiera), con la misma versión de la fila que `empresa_guardar_ajustes()`, que sigue
-- sin aceptarlas. La pantalla, Configuración › Cotización › Ajustes (4.20-4b). docs/GLOSARIO.md › «Ajustes de cotización».

create or replace function public.empresa_guardar_ajustes_de_cotizacion(
  p_vigencia_dias integer,
  p_vehiculo_obligatorio boolean,
  p_actualizado_en_esperado timestamptz
) returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.ajustes_empresa;
  v_nueva timestamptz;
begin
  perform public.assert_activo();
  if not exists (select 1 from public.mis_permisos() m where m.clave = 'cotizaciones.configurar' and m.origen_id is null) then
    raise exception 'No tienes el permiso «cotizaciones.configurar» en todos los orígenes.' using errcode = '42501';
  end if;
  if p_vigencia_dias is null or p_vigencia_dias not between 1 and 365 then
    raise exception 'La vigencia va de 1 a 365 días.' using errcode = '22023', hint = 'vigencia_dias';
  end if;
  if p_vehiculo_obligatorio is null then
    raise exception 'Falta decir si el vehículo es obligatorio al cotizar.' using errcode = '22023', hint = 'vehiculo_obligatorio_al_cotizar';
  end if;

  select * into v from public.ajustes_empresa where id = 1 for update;
  perform public._exigir_version(v.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió los ajustes de la empresa mientras los editabas.');

  update public.ajustes_empresa e
     set vigencia_dias = p_vigencia_dias,
         vehiculo_obligatorio_al_cotizar = p_vehiculo_obligatorio,
         actualizado_por = (select auth.uid())
   where e.id = 1
  returning e.actualizado_en into v_nueva;
  return v_nueva;
end;
$$;

revoke all on function public.empresa_guardar_ajustes_de_cotizacion(integer, boolean, timestamptz) from public, anon;
grant execute on function public.empresa_guardar_ajustes_de_cotizacion(integer, boolean, timestamptz) to authenticated, service_role;
comment on function public.empresa_guardar_ajustes_de_cotizacion(integer, boolean, timestamptz) is
  'Guarda la vigencia (1 a 365 días) y el vehículo obligatorio al cotizar (cotizaciones.configurar en todos los orígenes). Misma versión de la fila que empresa_guardar_ajustes: PT409 si cambió; 22023 con hint por valor fuera de rango. Paso 4.20-4a.';

comment on column public.ajustes_empresa.vigencia_dias is
  'Días desde el día de creado_en (en zona_horaria) en que una cotización vale; pasados, está vencida (D1). La cambia empresa_guardar_ajustes_de_cotizacion() (4.20-4a) con cotizaciones.configurar en todos los orígenes; la pantalla, Configuración › Cotización › Ajustes (4.20-4b).';
comment on column public.ajustes_empresa.vehiculo_obligatorio_al_cotizar is
  'D3 (Fase 4): sí por defecto. Con no, cotizacion_crear acepta una preventa sin vehículo; una final siempre lo exige. La cambia empresa_guardar_ajustes_de_cotizacion() (4.20-4a) con cotizaciones.configurar en todos los orígenes; la pantalla, Configuración › Cotización › Ajustes (4.20-4b).';

-- El catálogo dice lo que ahora mueve la clave sin origen (la nube no corre el seed; el seed dice lo mismo).
update public.permisos
   set descripcion = 'Fórmulas, constantes, tablas de referencia y plantilla (por origen); en todos los orígenes, también la vigencia y el vehículo obligatorio al cotizar',
       aplicado_en = 'formula_*, plantilla_*, tono_*, formula_para_cotizar, policy tablas_referencia, empresa_guardar_ajustes_de_cotizacion'
 where clave = 'cotizaciones.configurar';
