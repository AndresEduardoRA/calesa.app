// Ayudantes de `e2e/configuracion-flujos-reglas.spec.ts` (5.11): lo que el spec siembra y lee de la base local con SQL, para no tocar el flujo de la semilla.
import { sql } from './sql'

export const PREFIJO_DE_REGLAS_E2E = 'E2E 5.11'

// Una cadena SQL entre comillas simples (sólo para los textos propios del spec).
const literal = (texto: string) => `'${texto.replaceAll("'", "''")}'`

export function flujoDelOrigen(origenId: string): string {
  return sql(`select id from public.flujos where origen_id = ${literal(origenId)}`)
}

// Una fase del flujo que marca «Aduana» (el trigger exige la regla encendida).
export function sembrarFaseDeAduana(origenId: string, nombre: string): string {
  return sql(
    `insert into public.fases (flujo_id, nombre, orden, permite_aduana)
     values ('${flujoDelOrigen(origenId)}', ${literal(nombre)}, 10, true) returning id`,
  )
}

export function quitarAduanaDeLasFases(origenId: string): void {
  sql(
    `update public.fases set permite_aduana = false where flujo_id = '${flujoDelOrigen(origenId)}'`,
  )
}

export function reglaEnLaBase(origenId: string, regla: string): boolean {
  return (
    sql(
      `select coalesce((select activa from public.flujos_reglas where flujo_id = '${flujoDelOrigen(origenId)}' and regla = ${literal(regla)}), false)`,
    ) === 't'
  )
}

// Las filas de la oferta del flujo: `tipo:nombre`, ordenadas.
export function ofertaEnLaBase(origenId: string): string[] {
  const salida = sql(
    `select o.tipo || ':' || coalesce(p.nombre, n.nombre)
     from public.flujos_transporte_oferta o
     left join public.puertos p on p.id = o.puerto_id
     left join public.navieras n on n.id = o.naviera_id
     where o.flujo_id = '${flujoDelOrigen(origenId)}'
     order by 1`,
  )
  return salida === '' ? [] : salida.split('\n')
}

export function sembrarNaviera(nombre: string): void {
  sql(`insert into public.navieras (nombre) values (${literal(nombre)})`)
}

export function borrarNavierasDePrueba(): void {
  sql(
    `delete from public.flujos_transporte_oferta where naviera_id in (select id from public.navieras where nombre like '${PREFIJO_DE_REGLAS_E2E}%');
     delete from public.navieras where nombre like '${PREFIJO_DE_REGLAS_E2E}%'`,
  )
}
