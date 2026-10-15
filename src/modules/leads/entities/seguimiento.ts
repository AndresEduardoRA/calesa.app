// Los seguimientos de un lead: lo que entrega la base (`lead_seguimientos()` y las RPC
// `seguimiento_*`), cómo se lee y las reglas puras del redactor. Lo que cada quien ve lo decide la
// base: privado = sólo su autor; «Visible para el cliente» = también quienes ven el lead.
import { z } from 'zod'
import { instanteDeLocal } from '@/shared/lib/fechas'
import { validarDocumento, type Documento } from './documento'
import { documentoDesdeTexto } from './documento-limpio'
import { validarRecordatorio } from './recordatorio'

export const LARGO_MAXIMO_DEL_TITULO = 120
export const TAMANO_DE_PAGINA_DE_SEGUIMIENTOS = 20
export const VISIBILIDADES = ['privado', 'publico'] as const
export type Visibilidad = (typeof VISIBILIDADES)[number]

// El nombre del interruptor: «público» es lo que ve el portal, y la pantalla no habla del portal.
export const ETIQUETA_DE_VISIBLE = 'Visible para el cliente'

export const MENSAJE_DE_SEGUIMIENTO_NO_DISPONIBLE =
  'No encontramos este seguimiento o no tienes acceso.'

export type Seguimiento = {
  id: string
  leadId: string
  tipoId: string
  tipoNombre: string
  tipoIcono: string | null
  titulo: string
  // El documento del editor; nulo = sin detalle, o sólo el texto plano del alta.
  detalleDoc: unknown
  detalleTexto: string | null
  visibilidad: Visibilidad
  ocurridoEn: string
  // Su versión: la manda de vuelta quien edita, elimina o restaura.
  actualizadoEn: string
  eliminado: boolean
  autorId: string
  autorNombre: string | null
  esMio: boolean
}

export type PaginaDeSeguimientos = {
  seguimientos: Seguimiento[]
  hayMas: boolean
  // Tengo el lead en la cartera y `leads.editar`: puedo anotar y editar lo mío.
  puedoAnotar: boolean
}

const esquemaSeguimiento = z.object({
  id: z.guid(),
  lead_id: z.guid(),
  tipo_id: z.guid(),
  tipo_nombre: z.string(),
  tipo_icono: z.string().nullable(),
  titulo: z.string(),
  detalle_doc: z.unknown(),
  detalle_texto: z.string().nullable(),
  visibilidad: z.enum(VISIBILIDADES),
  ocurrido_en: z.string(),
  actualizado_en: z.string(),
  eliminado: z.boolean(),
  autor_id: z.guid(),
  autor_nombre: z.string().nullable(),
  es_mio: z.boolean(),
})

function comoSeguimiento(s: z.infer<typeof esquemaSeguimiento>): Seguimiento {
  return {
    id: s.id,
    leadId: s.lead_id,
    tipoId: s.tipo_id,
    tipoNombre: s.tipo_nombre,
    tipoIcono: s.tipo_icono,
    titulo: s.titulo,
    detalleDoc: s.detalle_doc ?? null,
    detalleTexto: s.detalle_texto,
    visibilidad: s.visibilidad,
    ocurridoEn: s.ocurrido_en,
    actualizadoEn: s.actualizado_en,
    eliminado: s.eliminado,
    autorId: s.autor_id,
    autorNombre: s.autor_nombre,
    esMio: s.es_mio,
  }
}

// Un seguimiento de la respuesta de una RPC. Una forma rota es `null`: quien llama lo trata como
// un error.
export function seguimientoDesde(crudo: unknown): Seguimiento | null {
  const leido = esquemaSeguimiento.safeParse(crudo)
  return leido.success ? comoSeguimiento(leido.data) : null
}

const esquemaPagina = z.object({
  seguimientos: z.array(z.unknown()),
  hay_mas: z.boolean(),
  puedo_anotar: z.boolean(),
})

// La página de `lead_seguimientos()`. Una fila que no cumple se descarta; una página rota es `null`.
export function paginaDeSeguimientosDesde(crudo: unknown): PaginaDeSeguimientos | null {
  const leido = esquemaPagina.safeParse(crudo)
  if (!leido.success) {
    return null
  }
  return {
    seguimientos: leido.data.seguimientos.flatMap((fila) => {
      const s = seguimientoDesde(fila)
      return s ? [s] : []
    }),
    hayMas: leido.data.hay_mas,
    puedoAnotar: leido.data.puedo_anotar,
  }
}

// --- Reglas del redactor ------------------------------------------------------------------------

export function puedeEditarSeguimiento(seguimiento: Seguimiento, puedoAnotar: boolean): boolean {
  return seguimiento.esMio && puedoAnotar
}

// Quién lo anotó, dicho para la línea de tiempo.
export function autorDe(seguimiento: Seguimiento): string {
  if (seguimiento.esMio) {
    return 'Tú'
  }
  return seguimiento.autorNombre ?? 'Otra persona'
}

// Más recientes primero, como los entrega la base (`ocurrido_en desc, id desc`).
function antes(a: Seguimiento, b: Seguimiento): number {
  if (a.ocurridoEn !== b.ocurridoEn) {
    return Date.parse(b.ocurridoEn) - Date.parse(a.ocurridoEn)
  }
  return b.id < a.id ? -1 : b.id > a.id ? 1 : 0
}

// Pone (o reemplaza) uno en la lista, en su lugar. Uno eliminado sale.
export function conSeguimiento(lista: readonly Seguimiento[], uno: Seguimiento): Seguimiento[] {
  const otros = lista.filter((s) => s.id !== uno.id)
  return uno.eliminado ? otros : [...otros, uno].sort(antes)
}

// El cursor de «Ver más»: el último de la página.
export function cursorDeSeguimientos(
  lista: readonly Seguimiento[],
): { antesEn: string; antesId: string } | null {
  const ultimo = lista.at(-1)
  return ultimo ? { antesEn: ultimo.ocurridoEn, antesId: ultimo.id } : null
}

// Lo que trae una página más, sin repetir lo que ya está (una anotación nueva corre la lista).
export function sumarPagina(
  lista: readonly Seguimiento[],
  nuevos: readonly Seguimiento[],
): Seguimiento[] {
  const vistos = new Set(lista.map((s) => s.id))
  return [...lista, ...nuevos.filter((s) => !vistos.has(s.id))]
}

export type ValoresDelSeguimiento = {
  tipoId: string
  titulo: string
  detalle: Documento | null
  visible: boolean
  // `aaaa-mm-ddThh:mm` en la zona de la empresa; vacío = «ahora» (sólo al anotar).
  ocurridoEn: string
  // Un recordatorio que entra junto con el seguimiento (sólo al anotar); vacío = ninguno.
  recordatorio: string
}

export type CambiosDeSeguimiento = Partial<{
  tipoId: string
  titulo: string
  detalle: Documento | null
  visibilidad: Visibilidad
  ocurridoEn: string
}>

export type ErroresDelSeguimiento = Partial<
  Record<'tipoId' | 'titulo' | 'detalle' | 'ocurridoEn' | 'recordatorio', string>
>

export type SeguimientoValido =
  | {
      ok: true
      tipoId: string
      titulo: string
      detalle: Documento | null
      visibilidad: Visibilidad
      ocurridoEn: string | null
      // Nulo = sin recordatorio.
      recordarEn: string | null
    }
  | { ok: false; errores: ErroresDelSeguimiento }

// Puede ser pasada, no futura. La base acepta unos minutos de adelanto por los relojes; la
// pantalla, ninguno.
function validarFecha(
  local: string,
  ahora: string,
  zona: string,
): { ok: true; instante: string | null } | { ok: false; motivo: string } {
  if (local === '') {
    return { ok: true, instante: null }
  }
  const instante = instanteDeLocal(local, { zona })
  if (!instante) {
    return { ok: false, motivo: 'Elige cuándo fue.' }
  }
  if (Date.parse(instante) > Date.parse(ahora)) {
    return {
      ok: false,
      motivo: 'Un seguimiento no puede ser en el futuro: para eso, agenda un recordatorio.',
    }
  }
  return { ok: true, instante }
}

function motivoDelTitulo(titulo: string): string | null {
  if (titulo === '') {
    return 'Escribe un resumen del seguimiento.'
  }
  return titulo.length > LARGO_MAXIMO_DEL_TITULO
    ? `El resumen admite hasta ${String(LARGO_MAXIMO_DEL_TITULO)} caracteres.`
    : null
}

// Con qué arranca el editor: el documento, o el texto plano del alta como párrafos.
export function documentoInicial(seguimiento: Seguimiento): Documento | null {
  return (
    (seguimiento.detalleDoc as Documento | null) ?? documentoDesdeTexto(seguimiento.detalleTexto)
  )
}

// El recordatorio que entra junto con un seguimiento nuevo: a futuro, en la zona de la empresa.
function recordarEnDe(
  local: string,
  original: Seguimiento | null,
  ahora: string,
  zona: string,
): { ok: true; instante: string | null } | { ok: false; motivo: string } {
  if (original || local === '') {
    return { ok: true, instante: null }
  }
  const valido = validarRecordatorio(local, ahora, zona)
  return valido.ok ? { ok: true, instante: valido.recordarEn } : valido
}

// Un tipo apagado que el seguimiento ya tiene se conserva; pasar a otro apagado, no.
function motivoDelTipo(
  tipoId: string,
  tiposActivos: readonly string[],
  original: Seguimiento | null,
): string | null {
  return tiposActivos.includes(tipoId) || tipoId === original?.tipoId
    ? null
    : 'Elige un tipo de seguimiento que esté activo.'
}

// Sólo los campos con motivo.
function erroresDe(
  motivos: Record<keyof ErroresDelSeguimiento, string | null>,
): ErroresDelSeguimiento {
  return Object.fromEntries(
    Object.entries(motivos).filter((par): par is [string, string] => par[1] !== null),
  ) as ErroresDelSeguimiento
}

// Lo que el redactor manda, con los mismos motivos que la base y en el mismo campo.
export function validarSeguimiento(
  valores: ValoresDelSeguimiento,
  { ahora, zona, tiposActivos }: { ahora: string; zona: string; tiposActivos: readonly string[] },
  original: Seguimiento | null = null,
): SeguimientoValido {
  const titulo = valores.titulo.trim()
  const detalle = validarDocumento(valores.detalle)
  const fecha = validarFecha(valores.ocurridoEn, ahora, zona)
  const recordar = recordarEnDe(valores.recordatorio, original, ahora, zona)
  const errores = erroresDe({
    titulo: motivoDelTitulo(titulo),
    tipoId: motivoDelTipo(valores.tipoId, tiposActivos, original),
    detalle: detalle.ok ? null : detalle.motivo,
    ocurridoEn: fecha.ok ? null : fecha.motivo,
    recordatorio: recordar.ok ? null : recordar.motivo,
  })
  if (!detalle.ok || !fecha.ok || !recordar.ok || Object.keys(errores).length > 0) {
    return { ok: false, errores }
  }
  return {
    ok: true,
    tipoId: valores.tipoId,
    titulo,
    detalle: detalle.documento,
    visibilidad: valores.visible ? 'publico' : 'privado',
    ocurridoEn: fecha.instante,
    recordarEn: recordar.instante,
  }
}

const mismoDocumento = (a: unknown, b: unknown) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

// De una edición válida, sólo lo que cambió. Sin cambios, nada que mandar.
export function cambiosDelSeguimiento(
  original: Seguimiento,
  valido: Extract<SeguimientoValido, { ok: true }>,
): CambiosDeSeguimiento {
  const cambios: CambiosDeSeguimiento = {}
  if (valido.tipoId !== original.tipoId) {
    cambios.tipoId = valido.tipoId
  }
  if (valido.titulo !== original.titulo) {
    cambios.titulo = valido.titulo
  }
  // Contra lo que mostró el editor al abrir: uno del alta que no se tocó sigue siendo sólo texto.
  if (!mismoDocumento(valido.detalle, documentoInicial(original))) {
    cambios.detalle = valido.detalle
  }
  if (valido.visibilidad !== original.visibilidad) {
    cambios.visibilidad = valido.visibilidad
  }
  if (
    valido.ocurridoEn !== null &&
    Date.parse(valido.ocurridoEn) !== Date.parse(original.ocurridoEn)
  ) {
    cambios.ocurridoEn = valido.ocurridoEn
  }
  return cambios
}
