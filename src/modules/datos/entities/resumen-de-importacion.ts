// Una importación total vista desde la pantalla (9.06-5): su avance, su estado y la frase del resultado. Sin I/O: la lectura está en
// `infra/importaciones.client.ts` y la hace el navegador con la sesión de quien mira (la policy decide qué filas ve).
import { z } from 'zod'
import { formatearNumero } from '@/shared/lib/formato'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'

export type ResumenDeImportacion = {
  id: string
  entidad: 'leads' | 'vehiculos'
  estado: 'pendiente' | 'procesando' | 'terminada' | 'fallida'
  // ISO, tal como los da la base (el cursor los usa sin pasar por `Date`).
  creadoEn: string
  avanceEn: string | null
  terminadaEn: string | null
  filasTotal: number | null
  procesadas: number
  creadas: number
  yaExistian: number
  rechazadas: number
  motivoDeFalla: string | null
  quien: string | null
  destino: string | null
  origen: string | null
}

export type EstadoVisible = 'esperando' | 'importando' | 'en_pausa' | 'terminada' | 'fallida'

// Sin avance hace más de 2 min: la retoma el job `importaciones-continuar` (D14, D24 de las partes 2 y 3; D52).
export const PAUSA_TRAS_MS = 2 * 60 * 1000
export const SONDEO_MS = 5000
// El informe por fila se purga a los 30 días de terminada o fallida (D15).
export const DIAS_DEL_INFORME = 30
const MS_DEL_INFORME = DIAS_DEL_INFORME * 24 * 60 * 60 * 1000

// Sin `mapeo` ni `archivo_ruta` (la ruta lleva el id de la persona). Los embebidos van por el nombre de su FK.
export const SELECCION_DE_IMPORTACION =
  'id, entidad, estado, creado_en, avance_en, terminada_en, filas_total, procesadas, filas_ok, ya_existian, rechazadas, errores, quien:perfiles!importaciones_usuario_id_fkey(nombre), destino:perfiles!importaciones_asignar_a_fkey(nombre), origen:origenes!importaciones_origen_id_fkey(nombre)'

const nombre = z.object({ nombre: z.string().nullable() }).nullable()
const esquemaDeLaFila = z.object({
  id: z.guid(),
  entidad: z.enum(['leads', 'vehiculos']),
  estado: z.enum(['pendiente', 'procesando', 'terminada', 'fallida']),
  creado_en: z.string().min(10),
  avance_en: z.string().nullable(),
  terminada_en: z.string().nullable(),
  filas_total: z.number().int().nullable(),
  procesadas: z.number().int(),
  filas_ok: z.number().int().nullable(),
  ya_existian: z.number().int(),
  rechazadas: z.number().int(),
  errores: z.unknown(),
  quien: nombre,
  destino: nombre,
  origen: nombre,
})

function primerMotivo(errores: unknown): string | null {
  const leido = z.array(z.object({ motivo: z.string().min(1) }).loose()).safeParse(errores)
  return leido.success ? (leido.data[0]?.motivo ?? null) : null
}

/** Las filas de la base en la forma de la pantalla, o nulo si no son lo que promete. */
export function resumenesDesde(crudo: unknown): ResumenDeImportacion[] | null {
  const leidas = z.array(esquemaDeLaFila).safeParse(crudo)
  if (!leidas.success) return null
  return leidas.data.map((f) => ({
    id: f.id,
    entidad: f.entidad,
    estado: f.estado,
    creadoEn: f.creado_en,
    avanceEn: f.avance_en,
    terminadaEn: f.terminada_en,
    filasTotal: f.filas_total,
    procesadas: f.procesadas,
    creadas: f.filas_ok ?? 0,
    yaExistian: f.ya_existian,
    rechazadas: f.rechazadas,
    motivoDeFalla: primerMotivo(f.errores),
    quien: f.quien?.nombre ?? null,
    destino: f.destino?.nombre ?? null,
    origen: f.origen?.nombre ?? null,
  }))
}

export function enCurso(r: Pick<ResumenDeImportacion, 'estado'>): boolean {
  return r.estado === 'pendiente' || r.estado === 'procesando'
}

/** La pausa se mira primero: una `pendiente` que nunca empezó (falló el despertar) está a medias, no «esperando». */
export function estadoVisible(r: ResumenDeImportacion, ahora: number): EstadoVisible {
  if (!enCurso(r)) return r.estado === 'terminada' ? 'terminada' : 'fallida'
  if (ahora - Date.parse(r.avanceEn ?? r.creadoEn) > PAUSA_TRAS_MS) return 'en_pausa'
  return r.estado === 'pendiente' && r.filasTotal === null ? 'esperando' : 'importando'
}

export const ETIQUETA_DE_ESTADO: Record<EstadoVisible, string> = {
  esperando: 'Pendiente',
  importando: 'Importando',
  en_pausa: 'En pausa',
  terminada: 'Terminada',
  fallida: 'Fallida',
}
export const TONO_DE_ESTADO: Record<
  EstadoVisible,
  'secondary' | 'default' | 'outline' | 'destructive'
> = {
  esperando: 'outline',
  importando: 'default',
  en_pausa: 'outline',
  terminada: 'secondary',
  fallida: 'destructive',
}

function contar(n: number, uno: string, varios: string, locale: string): string {
  return `${formatearNumero(n, { locale })} ${n === 1 ? uno : varios}`
}

function deTantas(r: ResumenDeImportacion, locale: string): string {
  const hechas = formatearNumero(r.procesadas, { locale })
  return r.filasTotal === null
    ? `${hechas} filas`
    : `${hechas} de ${formatearNumero(r.filasTotal, { locale })} filas`
}

/** «2 creados, 1 ya existía y ninguno con errores.» (D53). */
export function fraseDelResultado(r: ResumenDeImportacion, locale: string): string {
  const errores =
    r.rechazadas === 0
      ? 'ninguno con errores'
      : `${formatearNumero(r.rechazadas, { locale })} con errores`
  return `${contar(r.creadas, 'creado', 'creados', locale)}, ${contar(r.yaExistian, 'ya existía', 'ya existían', locale)} y ${errores}.`
}

export function fraseDelAvance(r: ResumenDeImportacion, ahora: number, locale: string): string {
  switch (estadoVisible(r, ahora)) {
    case 'esperando':
      return 'Esperando a que empiece…'
    case 'importando':
      return `Importando… ${deTantas(r, locale)}.`
    case 'en_pausa':
      return r.filasTotal === null
        ? 'En pausa: sigue sola en unos minutos.'
        : `En pausa: sigue sola en unos minutos (${deTantas(r, locale)}).`
    case 'terminada':
      return fraseDelResultado(r, locale)
    case 'fallida': {
      const motivo = (r.motivoDeFalla ?? 'Se detuvo por un error').replace(/\.+$/, '')
      return `No terminó: ${motivo}. Llegó a ${deTantas(r, locale)}.`
    }
  }
}

/** Las rechazadas se descargan de una terminada o fallida que tuvo alguna, mientras la base guarda el informe (D54). */
export function rechazadasDe(
  r: ResumenDeImportacion,
  ahora: number,
): 'ninguna' | 'disponibles' | 'vencidas' {
  if (enCurso(r) || r.yaExistian + r.rechazadas === 0) return 'ninguna'
  if (r.terminadaEn !== null && ahora - Date.parse(r.terminadaEn) > MS_DEL_INFORME)
    return 'vencidas'
  return 'disponibles'
}

/** Qué se relee en el próximo tic: las seguidas sin leer primero y las en curso, sin repetir y con tope (no crece con lo cargado). */
export function idsParaSondear(
  resumenes: readonly ResumenDeImportacion[],
  sinLeer: readonly string[],
): string[] {
  const ids = new Set(sinLeer)
  for (const r of resumenes) if (enCurso(r)) ids.add(r.id)
  return [...ids].slice(0, TAMANO_DE_VER_MAS + 1)
}

/** Reemplaza por id lo que se volvió a leer y deja el orden. */
export function fusionar(
  lista: readonly ResumenDeImportacion[],
  leidas: readonly ResumenDeImportacion[],
): ResumenDeImportacion[] {
  const porId = new Map(leidas.map((r) => [r.id, r]))
  return lista.map((r) => porId.get(r.id) ?? r)
}
