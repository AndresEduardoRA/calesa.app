// Exportar todo (9.05, `datos.exportar.todo`): el pedido, los topes, el rango por fechas y lo que contesta la base al registrar. Sin I/O.
// El enforcement es de la base (`datos_exportacion_registrar`): esto sólo arma el pedido y lee la respuesta.
import { z } from 'zod'
import { DELIMITADORES, type Celda, type Delimitador } from '@/shared/lib/csv/escribir'
import type { Resultado } from '@/shared/lib/errores'
import { diaEnZona, diaSiguiente, inicioDelDia } from '@/shared/lib/fechas'
import type { Cursor } from '@/shared/lib/paginacion'

// Cuántas filas lleva como mucho un archivo. Es el techo de la base (`datos_exportacion_registrar`, 250.000); medido con volumen en
// `supabase/tests/medir-datos-exportar.sql` (9.05-2): si la lectura entera no entra en la vida del token, este tope baja (la base sigue igual).
export const TOPE_DE_FILAS = 250000
// De a cuántas filas se lee: el `max_rows` de PostgREST (`supabase/config.toml`). Más, y PostgREST cortaría sin avisar.
export const FILAS_POR_PEDIDO = 1000
// Si al token de la sesión le queda menos que esto al empezar, se renueva dentro del pedido (la cookie nueva viaja en la respuesta).
export const VIDA_MINIMA_DEL_TOKEN_MS = 5 * 60_000
// El flujo no pide una página si al token le queda menos que esto: corta con error antes que mandar un pedido que va a dar 401.
export const MARGEN_DEL_TOKEN_MS = 30_000

// Lo que se puede exportar hoy. La 9.05-2b suma vehículos y cotizaciones.
export const ENTIDADES_DISPONIBLES = ['leads'] as const
export type Entidad = (typeof ENTIDADES_DISPONIBLES)[number]

export const esquemaDelPedido = z
  .object({
    entidad: z.enum(ENTIDADES_DISPONIBLES),
    delimitador: z.enum(DELIMITADORES),
    desde: z.iso.date().optional(),
    hasta: z.iso.date().optional(),
    origen: z.guid().optional(),
  })
  .strict()
  .refine((p) => p.desde === undefined || p.hasta === undefined || p.desde <= p.hasta, {
    error: 'La fecha final es anterior a la inicial.',
    path: ['hasta'],
  })
  // Espejo de la base: en leads el origen no es un filtro (la base lo vuelve a rechazar). Hoy sólo hay leads; la 9.05-2b lo condiciona a la
  // entidad (vehículos lo exige).
  .refine((p) => p.origen === undefined, {
    error: 'Los leads no se filtran por origen.',
    path: ['origen'],
  })

export type Pedido = z.infer<typeof esquemaDelPedido>

export type FiltrosDelPedido = { desde?: string; hasta?: string; origen?: string }

// Lo que se manda a `p_filtros`: sólo las claves presentes.
export function filtrosDelPedido(pedido: Pedido): FiltrosDelPedido {
  return {
    ...(pedido.desde === undefined ? {} : { desde: pedido.desde }),
    ...(pedido.hasta === undefined ? {} : { hasta: pedido.hasta }),
    ...(pedido.origen === undefined ? {} : { origen: pedido.origen }),
  }
}

// El rango de `creado_en` que se lee. `hastaEn` es el instante de corte (tomado al entrar: lo que se crea durante la descarga no entra) o,
// si el día `hasta` termina antes, el inicio del día siguiente (sin incluir). El conteo y la lectura usan el mismo rango.
export type Rango = { desdeEn: string | null; hastaEn: string; hastaIncluido: boolean }

export function rangoDelPedido(pedido: Pedido, zona: string, corte: string): Rango {
  const desdeEn = pedido.desde === undefined ? null : inicioDelDia(pedido.desde, { zona })
  if (pedido.hasta !== undefined) {
    const finDelDia = inicioDelDia(diaSiguiente(pedido.hasta), { zona })
    if (Date.parse(finDelDia) <= Date.parse(corte)) {
      return { desdeEn, hastaEn: finDelDia, hastaIncluido: false }
    }
  }
  return { desdeEn, hastaEn: corte, hastaIncluido: true }
}

// Lo que contesta `datos_exportacion_registrar`: la constancia quedó, o el cupo de la hora se gastó hasta `libreEn`.
export type Registro = { ok: true } | { ok: false; libreEn: string }

const esquemaDelRegistro = z.union([
  z.object({ ok: z.literal(true), restantes: z.number() }),
  z.object({ ok: z.literal(false), libre_en: z.string() }),
])

export function registroDesde(crudo: unknown): Registro | null {
  const leido = esquemaDelRegistro.safeParse(crudo)
  if (!leido.success) {
    return null
  }
  return leido.data.ok ? { ok: true } : { ok: false, libreEn: leido.data.libre_en }
}

export function necesitaRenovar(venceEnSeg: number, ahoraMs: number): boolean {
  return venceEnSeg * 1000 - ahoraMs < VIDA_MINIMA_DEL_TOKEN_MS
}

export function quedaToken(venceEnSeg: number, ahoraMs: number): boolean {
  return venceEnSeg * 1000 - ahoraMs >= MARGEN_DEL_TOKEN_MS
}

// `leads-todos-AAAA-MM-DD.csv`, con el día en la zona de la empresa.
export function nombreDelArchivo(entidad: Entidad, ahoraIso: string, zona: string): string {
  return `${entidad}-todos-${diaEnZona(ahoraIso, { zona })}.csv`
}

// La fila de `datos_exportar_leads()` que lee el flujo (las 11 columnas del archivo), en camelCase. El teléfono ya viene enmascarado si el
// lead no es de la cartera de quien exporta (`telefonoVisible` falso); los atributos, sin los de sólo cartera.
export type FilaDeLeadAExportar = {
  id: string
  numero: number | null
  nombre: string
  telefono: string | null
  telefonoVisible: boolean
  tipoLeadId: string
  origenLeadId: string | null
  atributos: Record<string, unknown>
  duenoId: string | null
  creadoEn: string
  ultimoSeguimientoEn: string | null
}

// Lo que lee una entidad: contar hasta el tope y leer una página por cursor desde el corte. Lo da `composicion.ts` con la sesión de quien exporta.
// El registrar no está acá: es uno solo para todas las entidades (`registrarExportacion`), y ninguna fuente lo puede saltar.
export type LectorDeExportacion<Fila> = {
  contar: (rango: Rango, tope: number) => Promise<Resultado<{ n: number; hayMas: boolean }>>
  pagina: (
    rango: Rango,
    cursor: Cursor | null,
  ) => Promise<Resultado<{ filas: Fila[]; siguiente: Cursor | null }>>
}

// Cómo se escribe una entidad: los encabezados, una fila y lo que hay que traer antes de escribir una página (los nombres de los dueños).
export type ColumnasDeExportacion<Fila> = {
  encabezados: readonly Celda[]
  fila: (fila: Fila) => Celda[]
  antesDeEscribir?: (filas: readonly Fila[]) => Promise<Resultado<void>>
}

export type Registrador = (
  entidad: Entidad,
  filas: number,
  filtros: FiltrosDelPedido,
) => Promise<Resultado<Registro>>

export type SalidaDeExportacionTotal =
  | { tipo: 'listo'; nombre: string; filas: number; flujo: ReadableStream<Uint8Array> }
  | { tipo: 'sin_permiso' }
  | { tipo: 'sesion' }
  | { tipo: 'vacia' }
  | { tipo: 'demasiadas' }
  | { tipo: 'limite'; libreEn: string }
  | { tipo: 'error'; mensaje: string }

export type { Delimitador }
