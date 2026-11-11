-- La validación de un requisito de fase (paso 5.07-1), recreada desde la base (B:11219) con las mismas reglas y códigos. Cambia:
--   · cada error lleva en `hint` el campo que falló (`clave_dato`, `config`, `formatos`, `tipo_documento_id`, `espera_fase_id`);
--   · se suma una regla: no se espera a una fase jubilada (`22023`);
--   · en UPDATE sólo se revalida el grupo cuyo campo cambió (la espera, el documento o el dato). Una espera vieja cuya regla `esperas` se
--     apagó después, o cuya fase se jubiló, o un tipo de documento cuyos formatos cambiaron, no impiden guardar sus notas, volverla
--     bloqueante ni reordenar la fase (`requisito_mover` renumera filas que no tocan esos campos).
-- La función no la ejecuta nadie a mano: el trigger corre sin pedir EXECUTE a quien escribe.

create or replace function public.fase_requisito_validar() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_flujo uuid;
  v_ambito public.ambito_flujo;
  v_ambito_espera public.ambito_flujo;
  v_espera_activa boolean;
  v_formatos text[];
  v_mira_dato boolean;
  v_mira_documento boolean;
  v_mira_espera boolean;
begin
  if tg_op = 'INSERT' then
    v_mira_dato := true;
    v_mira_documento := true;
    v_mira_espera := true;
  else
    v_mira_dato := new.fase_id is distinct from old.fase_id or new.tipo is distinct from old.tipo
      or new.clave_dato is distinct from old.clave_dato or new.config is distinct from old.config;
    v_mira_documento := new.fase_id is distinct from old.fase_id or new.tipo is distinct from old.tipo
      or new.tipo_documento_id is distinct from old.tipo_documento_id or new.formatos is distinct from old.formatos;
    v_mira_espera := new.fase_id is distinct from old.fase_id or new.tipo is distinct from old.tipo
      or new.espera_fase_id is distinct from old.espera_fase_id or new.espera_ambito is distinct from old.espera_ambito;
  end if;
  v_mira_dato := v_mira_dato and new.tipo = 'dato';
  v_mira_documento := v_mira_documento and new.tipo = 'documento';
  v_mira_espera := v_mira_espera and new.tipo = 'espera';

  select f.flujo_id, fl.ambito into v_flujo, v_ambito from public.fases f join public.flujos fl on fl.id = f.flujo_id where f.id = new.fase_id;

  if v_mira_dato then
    if not (new.clave_dato = any (public.claves_dato_requisito(v_ambito))) then
      raise exception 'Clave de dato desconocida para este flujo: %', new.clave_dato using errcode = '22023', hint = 'clave_dato';
    end if;
    if new.clave_dato = 'pagos.umbral_pct' and coalesce((new.config ->> 'pct')::numeric, -1) not between 0 and 100 then
      raise exception 'pagos.umbral_pct necesita config.pct entre 0 y 100' using errcode = '22023', hint = 'config';
    end if;
  end if;

  if v_mira_documento then
    select formatos into v_formatos from public.tipos_documento where id = new.tipo_documento_id;
    if new.formatos is not null and not (new.formatos <@ v_formatos) then
      raise exception 'Los formatos del requisito deben estar entre los del tipo de documento.' using errcode = '22023', hint = 'formatos';
    end if;
    if exists (select 1 from public.tipos_documento td where td.id = new.tipo_documento_id and td.flujo_id is not null and td.flujo_id <> v_flujo) then
      raise exception 'El tipo de documento pertenece a otro flujo.' using errcode = '22023', hint = 'tipo_documento_id';
    end if;
  end if;

  if v_mira_espera then
    if not public.flujo_regla_activa(v_flujo, 'esperas') then
      raise exception 'Las esperas están apagadas en este flujo.' using errcode = '23514', hint = 'espera_fase_id';
    end if;
    select fl.ambito, f.activa into v_ambito_espera, v_espera_activa
    from public.fases f join public.flujos fl on fl.id = f.flujo_id where f.id = new.espera_fase_id;
    if v_ambito_espera = v_ambito then
      raise exception 'Una espera apunta a una fase de OTRO flujo (vehículos ↔ repuestos).' using errcode = '22023', hint = 'espera_fase_id';
    end if;
    if not v_espera_activa then
      raise exception 'No se puede esperar a una fase jubilada.' using errcode = '22023', hint = 'espera_fase_id';
    end if;
    if (v_ambito = 'vehiculos' and new.espera_ambito <> 'hijos') or (v_ambito = 'repuestos' and new.espera_ambito <> 'padre') then
      raise exception 'Un vehículo espera a sus hijos (repuestos); un repuesto espera a su padre (vehículo).' using errcode = '22023', hint = 'espera_fase_id';
    end if;
  end if;
  return new;
end $$;

revoke all on function public.fase_requisito_validar() from public, anon, authenticated;
grant execute on function public.fase_requisito_validar() to service_role;
