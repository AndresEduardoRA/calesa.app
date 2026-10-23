import { literal, retener, sql } from './sql'

// Una baja en curso, como queda entre el primer lote y el último, para una persona cuya baja ya terminó: su fila de
// `equipo_bajas` sin terminar y un lead suyo todavía en su cartera, tomado por otra transacción hasta `soltar()`. El lote
// lo salta (`skip locked`) y `_baja_terminar()` no la cierra mientras quede: la corrida del job `equipo-bajas` (cada minuto)
// no la termina, corra cuando corra. Sólo con `terminada_en = null`, la corrida de ese minuto la cerraba (5a-32).
// `telefono` no puede repetirse entre proyectos.
export async function bajaEnCurso(correo: string, telefono: string) {
  const pendiente =
    sql(`with p as (select id from public.perfiles where email = ${literal(correo)}),
            l as (insert into public.leads (nombre, telefono_principal, creado_por)
                  select 'E2E Baja pendiente', ${literal(telefono)}, p.id from p returning id, creado_por),
            a as (insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso)
                  select id, creado_por, 'dueno' from l returning lead_id),
            b as (update public.equipo_bajas set terminada_en = null
                   where usuario_id = (select id from p) returning usuario_id)
       select a.lead_id from a, b`)
  if (pendiente === '') {
    throw new Error(`bajaEnCurso: ${correo} no tiene una baja que reabrir.`)
  }
  return retener(`select 1 from public.leads where id = ${literal(pendiente)} for update`)
}
