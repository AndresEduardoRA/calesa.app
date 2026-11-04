// Lo que los e2e de la página de una cotización guardada (paso 4.15-3, `/cotizaciones/[id]`) preparan y miran: guardar una cotización por la hoja y devolver su id, un vehículo de
// prueba, la fórmula de prueba con una tabla de referencia viva (lo que cambia entre guardar y abrir, C11) y el envejecimiento de una cotización por SQL.
import { expect, type Page } from '@playwright/test'
import { formulaDePrueba } from './cotizar-formula'
import {
  guardarConElAtajo,
  tarjetaGuardada,
  tipearEnLaHoja,
  vigilarGuardados,
} from './cotizar-guardar'
import { literal, sql } from './sql'

const json = (valor: unknown) => `$e2e$${JSON.stringify(valor)}$e2e$::jsonb`

// La URL de la hoja nueva de un origen, con su lead y, si hay, su vehículo.
export const urlDeLaHoja = (origenId: string, lead: string, vehiculoId?: string): string =>
  `/cotizaciones/nuevo?origen=${origenId}&lead=${lead}${vehiculoId ? `&vehiculo=${vehiculoId}` : ''}`

// Un vehículo del origen, con su año si hace falta (un dato del vehículo que una tabla de la fórmula de prueba usa).
export function crearVehiculoDePrueba(origenId: string, titulo: string, anio?: number): string {
  const columnas = anio === undefined ? 'origen_id, titulo' : 'origen_id, titulo, anio'
  const valores =
    anio === undefined
      ? `${literal(origenId)}::uuid, ${literal(titulo)}`
      : `${literal(origenId)}::uuid, ${literal(titulo)}, ${String(anio)}`
  sql(`insert into public.vehiculos (${columnas}) values (${valores})`)
  return sql(
    `select id from public.vehiculos where origen_id = ${literal(origenId)}::uuid and titulo = ${literal(titulo)}`,
  )
}

// Guarda una cotización por la hoja nueva (tipea `pub` y Ctrl/Cmd+S) y devuelve su id: el intento es el id de la cotización. La persona ya entró.
export async function guardarPorLaHoja(
  page: Page,
  datos: { origenId: string; lead: string; pub: string; vehiculoId?: string },
): Promise<string> {
  const guardados = await vigilarGuardados(page)
  await page.goto(urlDeLaHoja(datos.origenId, datos.lead, datos.vehiculoId))
  await tipearEnLaHoja(page, 'pub', datos.pub)
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  const id = guardados.pedidos[0]?.intento
  if (id === undefined) {
    throw new Error('No se vio el guardado.')
  }
  return id
}

export const numeroDeLaCotizacion = (id: string): string =>
  sql(`select numero from public.cotizaciones where id = ${literal(id)}::uuid`)

// La cotización más vieja de lo que vale (la vigencia es por día): sin pasar por los triggers de la base, como la siembra.
export function envejecerLaCotizacion(id: string, dias: number): void {
  sql(`
    begin;
    set local session_replication_role = replica;
    update public.cotizaciones set creado_en = creado_en - ${String(dias)} * interval '1 day' where id = ${literal(id)}::uuid;
    commit;`)
}

const COLUMNAS_DE_LA_TABLA = [
  { clave: 'anio', etiqueta: 'Año', tipo: 'anio' },
  { clave: 'factor', etiqueta: 'Factor', tipo: 'numero' },
]

// Publica en el origen la fórmula de prueba con tres cambios (C11, V28): su total suma también `x_tabla`, que va en el grupo `gpub`, y `ch_tabla` **no** va congelada en `params.tablas`, así que la lee viva
// (`tablas_referencia` y sus filas, la del origen). `x_tabla` casa por el año del vehículo. Lo que cambia entre guardar y abrir es una fila de esa tabla (`cambiarElFactorVivo`).
export function publicarConTablaViva(origenId: string, factorDe2019: number): void {
  const { definicion, params, diseno } = formulaDePrueba()
  const total = definicion.nodos.find((n) => n['id'] === 'total')
  if (total === undefined) {
    throw new Error('La fórmula de prueba no tiene su total.')
  }
  total['de'] = [...(total['de'] as string[]), 'x_tabla']
  // El total en dólares que dibuja la hoja es el de sus grupos (`totales.usd`): `x_tabla` entra al de `gpub`, si no, no sumaría.
  const xTabla = definicion.nodos.find((n) => n['id'] === 'x_tabla')
  if (xTabla === undefined) {
    throw new Error('La fórmula de prueba no tiene x_tabla.')
  }
  xTabla['grupo'] = 'gpub'
  const { tablas: _congeladas, ...sinTablas } = params
  sql(`
    do $f$
    declare v_def jsonb := ${json(definicion)}; v_par jsonb := ${json(sinTablas)}; v_dis jsonb := ${json(diseno)}; v_tabla uuid;
    begin
      delete from public.formulas where origen_id = ${literal(origenId)}::uuid;
      delete from public.tablas_referencia where origen_id = ${literal(origenId)}::uuid and clave = 'ch_tabla';
      insert into public.tablas_referencia (origen_id, clave, nombre, columnas)
      values (${literal(origenId)}::uuid, 'ch_tabla', 'Factores vivos', ${json(COLUMNAS_DE_LA_TABLA)}) returning id into v_tabla;
      insert into public.tablas_referencia_filas (tabla_id, valores, orden)
      values (v_tabla, ${json({ anio: 2018, factor: 11 })}, 0),
             (v_tabla, ${json({ anio: 2019, factor: factorDe2019 })}, 1),
             (v_tabla, ${json({ anio: 2020, factor: 33 })}, 2);
      insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
      values (${literal(origenId)}::uuid, 1, 'publicada', v_def, v_par, v_dis, public._preparar_publicacion(v_def, v_par, v_dis, false), 'E2E 4.15-3 tabla viva', now());
    end $f$`)
}

// Lo que haría quien configura las tablas: el factor del año 2019 de la tabla viva del origen cambia (la cotización ya guardada conserva el suyo).
export function cambiarElFactorVivo(origenId: string, factorDe2019: number): void {
  sql(`
    update public.tablas_referencia_filas f set valores = jsonb_set(f.valores, '{factor}', to_jsonb(${String(factorDe2019)}::numeric))
      from public.tablas_referencia t
     where f.tabla_id = t.id and t.origen_id = ${literal(origenId)}::uuid and t.clave = 'ch_tabla' and f.valores ->> 'anio' = '2019'`)
}
