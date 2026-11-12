// Una conversación tal como la dibuja la lista del chat: la fila que entrega `chat_conversaciones` ya validada. Sin I/O.
import { z } from 'zod'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'

// La base cuenta hasta 100 mensajes sin leer; 100 se muestra «99+» (un número que se muestra nunca es un total exacto).
export const TOPE_DE_NO_LEIDOS = 99
const MAXIMO_DE_LA_BASE = 100

const esquemaDeFila = z.object({
  id: z.guid(),
  tipo: z.enum(['directa', 'grupo']),
  nombre: z.string().nullable(),
  es_global: z.boolean(),
  ultimo_mensaje_en: z.string(),
  ultimo_leido_en: z.string().nullable(),
  silenciada: z.boolean(),
  no_leidos: z.number().int().min(0).max(MAXIMO_DE_LA_BASE),
  otro: z.object({ id: z.guid(), nombre: z.string().nullable() }).nullish(),
})

const esquemaDePagina = z.object({
  conversaciones: z.array(esquemaDeFila),
  hay_mas: z.boolean(),
})

export type TipoDeConversacion = 'directa' | 'grupo' | 'global'

export type Conversacion = {
  id: string
  tipo: TipoDeConversacion
  nombre: string | null
  esGlobal: boolean
  // Fechas ISO.
  ultimoMensajeEn: string
  ultimoLeidoEn: string | null
  silenciada: boolean
  noLeidos: number
  // En una directa, la otra persona.
  otro: { id: string; nombre: string | null } | null
}

export type PaginaDeConversaciones = {
  conversaciones: Conversacion[]
  hayMas: boolean
}

// La siguiente página es «lo que viene después de la última fila que viste»: `(ultimo_mensaje_en, id)` descendente.
export type CursorDeConversaciones = { ultimoMensajeEn: string; id: string }

export function cursorDe(c: Pick<Conversacion, 'ultimoMensajeEn' | 'id'>): CursorDeConversaciones {
  return { ultimoMensajeEn: c.ultimoMensajeEn, id: c.id }
}

// Un JSON mal formado es un valor, no una excepción.
export function leerPaginaDeConversaciones(json: unknown): Resultado<PaginaDeConversaciones> {
  const lectura = esquemaDePagina.safeParse(json)
  if (!lectura.success) {
    return fallo(
      'inesperado',
      'No pudimos leer tus conversaciones. Vuelve a intentar en un momento.',
    )
  }
  return ok({
    hayMas: lectura.data.hay_mas,
    conversaciones: lectura.data.conversaciones.map((f) => ({
      id: f.id,
      tipo: f.es_global ? 'global' : f.tipo,
      nombre: f.nombre,
      esGlobal: f.es_global,
      ultimoMensajeEn: f.ultimo_mensaje_en,
      ultimoLeidoEn: f.ultimo_leido_en,
      silenciada: f.silenciada,
      noLeidos: f.no_leidos,
      otro: f.otro ?? null,
    })),
  })
}

// Lo que devuelve `chat_no_leidos` (0 a 100, el tope de la base): lo demás es un fallo, no un número.
export function leerNoLeidos(json: unknown): Resultado<number> {
  const lectura = z.number().int().min(0).max(MAXIMO_DE_LA_BASE).safeParse(json)
  return lectura.success
    ? ok(lectura.data)
    : fallo('inesperado', 'No pudimos leer tus mensajes sin leer.')
}

// `0 → null` (no hay insignia), `1..99 → «n»`, `100 en adelante → «99+»`.
export function textoDeNoLeidos(n: number): string | null {
  if (n <= 0) {
    return null
  }
  return n > TOPE_DE_NO_LEIDOS ? `${TOPE_DE_NO_LEIDOS}+` : String(n)
}

export function tituloDe(c: Pick<Conversacion, 'tipo' | 'nombre' | 'otro'>): string {
  const nombre = c.tipo === 'directa' ? (c.otro?.nombre ?? c.nombre) : c.nombre
  return nombre && nombre.trim() !== '' ? nombre : 'Conversación'
}

const esquemaDeId = z.guid()

// `?c=`: sólo un GUID; lo ilegible es como no tener selección.
export function idDeConversacionEnLaUrl(texto: string | null | undefined): string | null {
  const lectura = esquemaDeId.safeParse(texto)
  return lectura.success ? lectura.data : null
}

// Del más reciente al más viejo: `(ultimo_mensaje_en, id)` descendente, como lee la base.
function masRecientePrimero(a: Conversacion, b: Conversacion): number {
  if (a.ultimoMensajeEn !== b.ultimoMensajeEn) {
    return Date.parse(a.ultimoMensajeEn) < Date.parse(b.ultimoMensajeEn) ? 1 : -1
  }
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0
}

// Funde la primera página recién leída (la que trae lo nuevo tras una señal) con lo cargado: las frescas mandan sobre las
// cargadas con el mismo id y lo cargado más allá del tramo que cubren (lo de «Ver más») se conserva.
export function fundirPagina(
  cargadas: readonly Conversacion[],
  frescas: readonly Conversacion[],
  hayMasAlla: boolean,
): Conversacion[] {
  const ultima = frescas.at(-1)
  const frescasPorId = new Set(frescas.map((c) => c.id))
  const dentroDelTramo = (c: Conversacion) =>
    !hayMasAlla || ultima === undefined ? true : masRecientePrimero(c, ultima) <= 0
  const conservadas = cargadas.filter((c) => !frescasPorId.has(c.id) && !dentroDelTramo(c))
  return [...frescas, ...conservadas].sort(masRecientePrimero)
}

// Suma una página de «Ver más» al final sin repetir lo que una fusión ya trajo.
export function sumarPagina(
  cargadas: readonly Conversacion[],
  siguientes: readonly Conversacion[],
): Conversacion[] {
  const vistas = new Set(cargadas.map((c) => c.id))
  return [...cargadas, ...siguientes.filter((c) => !vistas.has(c.id))]
}
