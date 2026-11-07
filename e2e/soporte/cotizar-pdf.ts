// Lo que comparten los e2e del PDF de una cotización (paso 4.18-3a): pedirlo con la sesión del contexto, leerlo con el lector de las pruebas y la cuenta de su total contra
// sus líneas (C13). Los tipos de cambio, los grupos con su bucket y los modos salen del snapshot de la cotización y de SU versión de la fórmula (SQL), nunca del spec.
import { expect, type APIResponse, type Page } from '@playwright/test'
import { textoDelPdf, type TextoDelPdf } from '../../scripts/pdf/texto-del-pdf'
import { formatearMonto } from '../../src/shared/lib/formato'
import { guardarConElAtajo, tarjetaGuardada, vigilarGuardados } from './cotizar-guardar'
import { literal, sql } from './sql'

export const NO_DISPONIBLE =
  'Esta cotización ya no está disponible: no existe o ya no tienes acceso.'

export const rutaDelPdfDe = (id: string) => `/cotizaciones/${id}/pdf`

// `page.request` lleva las cookies del contexto; sin seguir redirecciones, para ver la del proxy.
export const pedirElPdf = (page: Page, id: string): Promise<APIResponse> =>
  page.request.get(rutaDelPdfDe(id), { maxRedirects: 0 })

// El PDF de lo que no existe, está en la papelera o no se ve: el mismo 404 en texto, que no dice cuál de las tres.
export async function exigirNoDisponible(page: Page, id: string): Promise<void> {
  const respuesta = await pedirElPdf(page, id)
  expect(respuesta.status(), id).toBe(404)
  expect(respuesta.headers()['content-type']).toMatch(/^text\/plain/)
  expect(await respuesta.text()).toBe(NO_DISPONIBLE)
}

// A la papelera sin pasar por los triggers de la base, como la siembra.
export function mandarALaPapelera(id: string): void {
  sql(`
    begin;
    set local session_replication_role = replica;
    update public.cotizaciones set eliminado_en = now(), eliminado_por = creado_por where id = ${literal(id)}::uuid;
    commit;`)
}

export type PdfLeido = { leido: TextoDelPdf; lineas: string[]; bytes: number; ms: number }

export async function leerElPdf(page: Page, id: string): Promise<PdfLeido> {
  const desde = Date.now()
  const respuesta = await pedirElPdf(page, id)
  const cuerpo = await respuesta.body()
  const ms = Date.now() - desde
  expect(respuesta.status(), cuerpo.toString('utf8').slice(0, 200)).toBe(200)
  const leido = textoDelPdf(new Uint8Array(cuerpo))
  return { leido, lineas: leido.paginas.flatMap((p) => p.lineas), bytes: cuerpo.length, ms }
}

// Guarda la hoja abierta con Ctrl+S y devuelve el id de la cotización nueva.
export async function guardarLaHojaAbierta(page: Page): Promise<string> {
  const guardados = await vigilarGuardados(page)
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  const id = guardados.pedidos[0]?.intento
  if (id === undefined) {
    throw new Error('No se vio el guardado.')
  }
  return id
}

type Grupo = { id: string; etiqueta: string; bucket: string }
type Nodo = { id: string; grupo?: string; clave?: string }
type Modo = { clave: string; buckets: { bucket: string; nodo: string }[]; total_en: string }

export type Snapshot = {
  valores: Record<string, number | string | null>
  totales: { usd: number | null; bs: number | null }
  modo: string | null
  verBs: boolean
  numero: number
  grupos: Grupo[]
  nodos: Nodo[]
  buckets: Record<string, string>
  totalEn: string
  modos: Modo[] | null
  locale: string
  etiquetaDelTotal: string
}

// Lo guardado de una cotización con lo de SU versión de la fórmula que pide la cuenta, y la etiqueta del total de la plantilla publicada de su origen.
export function snapshotDe(id: string): Snapshot {
  return JSON.parse(
    sql(`
      select json_build_object(
        'valores', c.valores, 'totales', c.totales, 'modo', c.modo_tc, 'verBs', c.ver_total_bs, 'numero', c.numero,
        'grupos', f.definicion -> 'grupos', 'nodos', f.definicion -> 'nodos', 'buckets', f.definicion -> 'buckets',
        'totalEn', f.definicion ->> 'total_en', 'modos', f.diseno -> 'cabecera' -> 'modos',
        'locale', (select locale from public.ajustes_empresa where id = 1),
        'etiquetaDelTotal', coalesce((select p.definicion -> 'total' ->> 'etiqueta' from public.plantillas_tarjeta p
          where p.origen_id = c.origen_id order by p.version desc limit 1), 'Total'))
        from public.cotizaciones c join public.formulas f on f.id = c.formula_id
       where c.id = ${literal(id)}::uuid`),
  ) as Snapshot
}

// La moneda del total en Bs: la del tipo de cambio de `total_en`.
export function monedaDelTotal(s: Snapshot): string {
  const nodo = s.nodos.find((n) => n.id === bucketsDelModo(s).totalEn)
  return sql(`select moneda_a from public.tipos_cambio where clave = ${literal(nodo?.clave ?? '')}`)
}

// Qué tipo de cambio lleva cada bucket en el modo guardado (sin modo, los de la fórmula) y en cuál se dice el total.
export function bucketsDelModo(s: Snapshot): { buckets: Map<string, string>; totalEn: string } {
  const modo = s.modos?.find((m) => m.clave === s.modo)
  return modo
    ? { buckets: new Map(modo.buckets.map((b) => [b.bucket, b.nodo])), totalEn: modo.total_en }
    : { buckets: new Map(Object.entries(s.buckets)), totalEn: s.totalEn }
}

// Un monto en dólares al final de una línea («Remate USD 9.500,00»). La cuenta lee los de `es-BO` (el locale de la semilla).
const MONTO = /(?:^|\s)(USD[\s ]-?[\d.,]+)$/
export const usd = (s: Snapshot, valor: number) =>
  formatearMonto(valor, { moneda: 'USD', locale: s.locale })
const aNumero = (texto: string) =>
  Number(
    texto
      .replace(/^USD[\s ]/, '')
      .replace(/\./g, '')
      .replace(',', '.'),
  )

// Los montos impresos de cada grupo: las líneas con un monto entre el título del grupo y el siguiente título o el total.
export function montosPorGrupo(lineas: string[], s: Snapshot): Map<string, string[]> {
  const titulos = new Map(s.grupos.map((g) => [g.etiqueta, g.id]))
  const montos = new Map<string, string[]>()
  let actual: string | undefined
  for (const linea of lineas) {
    if (titulos.has(linea)) {
      actual = titulos.get(linea)
      continue
    }
    if (linea.startsWith(s.etiquetaDelTotal)) {
      break
    }
    const monto = MONTO.exec(linea)?.[1]
    if (actual !== undefined && monto !== undefined) {
      montos.set(actual, [...(montos.get(actual) ?? []), monto])
    }
  }
  return montos
}

// (a) Cada grupo imprime, sin contar los ceros, los valores de sus nodos en el snapshot.
export function filasSonLoGuardado(lineas: string[], s: Snapshot): void {
  const impresos = montosPorGrupo(lineas, s)
  for (const g of s.grupos) {
    const guardados = s.nodos
      .filter((n) => n.grupo === g.id)
      .flatMap((n) => {
        const v = s.valores[n.id]
        return typeof v === 'number' && v !== 0 ? [usd(s, v)] : []
      })
    const delPdf = (impresos.get(g.id) ?? []).filter((m) => aNumero(m) !== 0)
    expect(delPdf.sort(), `las filas de «${g.etiqueta}»`).toEqual(guardados.sort())
  }
}

export type Cuenta = { total: number; porLaCuenta: number; ingenua: number; tolerancia: number }

// (c) Bs = Σ por grupo (Σ de sus filas impresas) × tc(su bucket); el total es Bs ÷ tc(total_en). La tolerancia es la del redondeo de lo impreso.
export function cuentaDelPdf(lineas: string[], s: Snapshot): Cuenta {
  const { buckets, totalEn } = bucketsDelModo(s)
  const tc = (nodo: string | undefined) => {
    const v = nodo === undefined ? undefined : s.valores[nodo]
    if (typeof v !== 'number') {
      throw new Error(`El snapshot no trae el tipo de cambio ${String(nodo)}.`)
    }
    return v
  }
  const impresos = montosPorGrupo(lineas, s)
  let bs = 0
  let ingenua = 0
  let filas = 0
  let maximo = 0
  for (const g of s.grupos) {
    const suma = (impresos.get(g.id) ?? []).reduce((a, m) => a + aNumero(m), 0)
    const delBucket = tc(buckets.get(g.bucket))
    bs += suma * delBucket
    ingenua += suma
    filas += impresos.get(g.id)?.length ?? 0
    maximo = Math.max(maximo, delBucket)
  }
  const tcDelTotal = tc(totalEn)
  const linea = lineas.find((l) => l.startsWith(s.etiquetaDelTotal) && MONTO.test(l))
  const total = aNumero(MONTO.exec(linea ?? '')?.[1] ?? 'NaN')
  return {
    total,
    porLaCuenta: bs / tcDelTotal,
    ingenua,
    tolerancia: 0.005 * ((filas * maximo) / tcDelTotal + 1),
  }
}
