// La papelera de leads: lo que se envía sale del listado para todos y se puede restaurar hasta que
// se purga. Un envío es un lote (`lotes_papelera`), de 1 a 200, todo o nada; el lote es lo que se
// restaura o se purga, entero o por partes. Las reglas las aplica la base (`leads_papelera_*`);
// acá se lee lo que responde y se lo pone en palabras. Es la clase 3 de la auditoría: vale el
// permiso con su alcance y no abre datos privados (el nombre y nada más). Nada de React ni de
// Supabase.
import { z } from 'zod'
import { alcanceDe, puede, type Permisos } from '@/shared/lib/permisos'

export const MAXIMO_POR_LOTE = 200

// El valor de los textos que dice la pantalla de la papelera.
export const TITULO_DE_LA_PAPELERA = 'Papelera de leads'
export const ETIQUETA_DE_ENVIAR = 'Enviar a la papelera'

export type LeadEnPapelera = {
  id: string
  numero: number
  nombre: string
  // Por qué no se purga (un vehículo vinculado, pagos, el portal vigente); null = se puede.
  motivoDeBloqueo: string | null
  // Por qué no puede volver (su teléfono ya lo tiene otro lead); null = puede.
  motivoDeRestaurar: string | null
}

export type LoteDePapelera = {
  id: string
  // La versión del lote: restaurar y purgar la mandan.
  actualizadoEn: string
  creadoEn: string
  // Quién lo envió; null si esa persona ya no tiene nombre que mostrar.
  creadoPorNombre: string | null
  esMio: boolean
  // Cuándo lo purga el job si nadie lo restaura: `creado_en + papelera_dias`.
  purgaEl: string
  // Cuántos se enviaron; los que quedan son `leads`.
  enviados: number
  leads: LeadEnPapelera[]
}

const esquemaLotes = z.array(
  z.object({
    id: z.guid(),
    actualizado_en: z.string(),
    creado_en: z.string(),
    creado_por_nombre: z.string().nullable(),
    es_mio: z.boolean(),
    purga_el: z.string(),
    enviados: z.number(),
    leads: z
      .array(
        z.object({
          id: z.guid(),
          numero: z.number(),
          nombre: z.string(),
          motivo_de_bloqueo: z.string().nullable(),
          motivo_de_restaurar: z.string().nullable(),
        }),
      )
      .nullable(),
  }),
)

// La respuesta de `leads_papelera_listar()`: los lotes que todavía tienen algo adentro, del más
// nuevo al más viejo. Una forma rota es null (no una papelera vacía).
export function lotesDesde(crudo: unknown): LoteDePapelera[] | null {
  const leidos = esquemaLotes.safeParse(crudo)
  if (!leidos.success) {
    return null
  }
  return leidos.data.map((lote) => ({
    id: lote.id,
    actualizadoEn: lote.actualizado_en,
    creadoEn: lote.creado_en,
    creadoPorNombre: lote.creado_por_nombre,
    esMio: lote.es_mio,
    purgaEl: lote.purga_el,
    enviados: lote.enviados,
    leads: (lote.leads ?? []).map((lead) => ({
      id: lead.id,
      numero: lead.numero,
      nombre: lead.nombre,
      motivoDeBloqueo: lead.motivo_de_bloqueo,
      motivoDeRestaurar: lead.motivo_de_restaurar,
    })),
  }))
}

// ---------------------------------------------------------------------------
// Lo que responde cada operación
// ---------------------------------------------------------------------------

type Hecho = { id: string; numero: number; nombre: string }
type NoHecho = Hecho & { motivo: string }

export type ResultadoDeEnvio = {
  lote: string
  // La versión del lote: «Deshacer» la manda.
  actualizadoEn: string
  // Era un reintento del mismo envío: no se mandó de nuevo.
  repetido: boolean
  // Cuántos accesos al portal se cerraron al enviarlos.
  portalRevocados: number
  enviados: Hecho[]
}

const hecho = z.object({ id: z.guid(), numero: z.number(), nombre: z.string() })
const noHecho = hecho.extend({ motivo: z.string() })

const esquemaEnvio = z.object({
  lote: z.guid(),
  actualizado_en: z.string(),
  repetido: z.boolean().catch(false),
  portal_revocados: z.number().catch(0),
  enviados: z.array(hecho).nullable(),
})

export function envioDesde(crudo: unknown): ResultadoDeEnvio | null {
  const leido = esquemaEnvio.safeParse(crudo)
  if (!leido.success) {
    return null
  }
  const f = leido.data
  return {
    lote: f.lote,
    actualizadoEn: f.actualizado_en,
    repetido: f.repetido,
    portalRevocados: f.portal_revocados,
    enviados: f.enviados ?? [],
  }
}

export type ResultadoDeRestaurar = {
  actualizadoEn: string
  restaurados: Hecho[]
  // Su teléfono ya lo tomó otro lead: siguen en la papelera, con el motivo.
  pendientes: NoHecho[]
  quedan: number
}

const esquemaRestauracion = z.object({
  actualizado_en: z.string(),
  restaurados: z.array(hecho),
  pendientes: z.array(noHecho),
  quedan: z.number(),
})

export function restauracionDesde(crudo: unknown): ResultadoDeRestaurar | null {
  const leido = esquemaRestauracion.safeParse(crudo)
  if (!leido.success) {
    return null
  }
  const f = leido.data
  return {
    actualizadoEn: f.actualizado_en,
    restaurados: f.restaurados,
    pendientes: f.pendientes,
    quedan: f.quedan,
  }
}

export type ResultadoDePurgar = {
  actualizadoEn: string
  purgados: Hecho[]
  bloqueados: NoHecho[]
  quedan: number
}

const esquemaPurga = z.object({
  actualizado_en: z.string().nullable(),
  purgados: z.array(hecho),
  bloqueados: z.array(noHecho),
  quedan: z.number(),
})

export function purgaDesde(crudo: unknown): ResultadoDePurgar | null {
  const leido = esquemaPurga.safeParse(crudo)
  if (!leido.success) {
    return null
  }
  const f = leido.data
  return {
    actualizadoEn: f.actualizado_en ?? '',
    purgados: f.purgados,
    bloqueados: f.bloqueados,
    quedan: f.quedan,
  }
}

// ---------------------------------------------------------------------------
// El resultado, dicho entero
// ---------------------------------------------------------------------------

// Cuántos motivos se escriben antes de resumir el resto.
const MOTIVOS_A_LA_VISTA = 3

const plural = (cantidad: number, uno: string, varios: string) =>
  `${cantidad === 1 ? uno : varios} ${String(cantidad)}`

type Palabras = {
  uno: (nombre: string) => string
  varios: (cantidad: number) => string
  cola: string
  noSeHizo: string
}

function resumir(hechos: readonly Hecho[], noHechos: readonly NoHecho[], palabras: Palabras) {
  const total = hechos.length + noHechos.length
  const frases: string[] = []
  const [unico] = hechos
  if (total === 1 && unico) {
    frases.push(palabras.uno(unico.nombre))
  } else if (hechos.length > 0) {
    const cuenta = palabras.varios(hechos.length)
    frases.push(`${cuenta}${noHechos.length > 0 ? ` de ${String(total)}` : ''}${palabras.cola}.`)
  } else if (total > 1) {
    frases.push(`${palabras.noSeHizo} ninguno.`)
  }
  for (const uno of noHechos.slice(0, MOTIVOS_A_LA_VISTA)) {
    frases.push(`${palabras.noSeHizo} «${uno.nombre}»: ${uno.motivo}`)
  }
  const resto = noHechos.length - MOTIVOS_A_LA_VISTA
  if (resto > 0) {
    frases.push(`Y ${String(resto)} más.`)
  }
  return frases.join(' ')
}

export function resumenDeEnvio(envio: ResultadoDeEnvio): string {
  const base = resumir(envio.enviados, [], {
    uno: (nombre) => `«${nombre}» se envió a la papelera.`,
    varios: (cantidad) => plural(cantidad, 'Se envió', 'Se enviaron'),
    cola: ' a la papelera',
    noSeHizo: 'No se envió',
  })
  if (envio.portalRevocados === 0) {
    return base
  }
  return `${base} ${
    envio.portalRevocados === 1
      ? 'Se cerró su acceso al portal.'
      : `Se cerraron ${String(envio.portalRevocados)} accesos al portal.`
  }`
}

export function resumenDeRestauracion(restauracion: ResultadoDeRestaurar): string {
  return resumir(restauracion.restaurados, restauracion.pendientes, {
    uno: (nombre) => `«${nombre}» volvió a tus leads.`,
    varios: (cantidad) => plural(cantidad, 'Se restauró', 'Se restauraron'),
    cola: '',
    noSeHizo: 'No se restauró',
  })
}

export function resumenDePurga(purga: ResultadoDePurgar): string {
  return resumir(purga.purgados, purga.bloqueados, {
    uno: (nombre) => `«${nombre}» se purgó.`,
    varios: (cantidad) => plural(cantidad, 'Se purgó', 'Se purgaron'),
    cola: '',
    noSeHizo: 'No se purgó',
  })
}

// ---------------------------------------------------------------------------
// Cuándo se purga
// ---------------------------------------------------------------------------

const UN_DIA = 86_400_000

// Días enteros que faltan; cero = ya venció y lo toma la próxima pasada del job.
export function diasParaLaPurga(purgaEl: string, ahora: string): number {
  const faltan = (new Date(purgaEl).getTime() - new Date(ahora).getTime()) / UN_DIA
  return faltan > 0 ? Math.ceil(faltan) : 0
}

export function textoDePurga(dias: number): string {
  if (dias <= 0) {
    return 'Se purga en la próxima pasada'
  }
  return dias === 1 ? 'Se purga mañana' : `Se purga en ${String(dias)} días`
}

// Lo que hay que tipear para purgar un lote de varios: ata la confirmación a su tamaño.
export function palabraDePurga(cantidad: number): string {
  return `purgar ${String(cantidad)}`
}

// ---------------------------------------------------------------------------
// Quién envía y quién abre la papelera
// ---------------------------------------------------------------------------

// ¿Puede enviar este lead a la papelera? Con `leads.eliminar` «todos», cualquiera que ve; con
// «propios», sólo su dueño. La base lo vuelve a decidir (`leads_papelera_enviar()`).
export function puedeEnviarLead(
  permisos: Permisos,
  duenoId: string | null,
  usuarioId: string,
): boolean {
  const alcance = alcanceDe(permisos, 'leads.eliminar')
  return alcance === 'todos' || (alcance === 'propios' && duenoId === usuarioId)
}

// La papelera la abre quien envía (ve lo suyo) o quien puede vaciarla (ve todo). También quien importa:
// deshacer una importación deja un lote suyo, que puede restaurar aunque no tenga `leads.eliminar`.
export function puedeAbrirLaPapelera(permisos: Permisos): boolean {
  return (
    puede(permisos, 'leads.eliminar') ||
    puede(permisos, 'leads.papelera.purgar') ||
    puede(permisos, 'leads.crear')
  )
}

export function puedePurgarLeads(permisos: Permisos): boolean {
  return puede(permisos, 'leads.papelera.purgar')
}

// Lo que la ficha ya sabe que la base va a rechazar: un vehículo vinculado que quien mira ve. Los que
// no ve no se cuentan; si uno de esos lo frena, lo dice la base al intentar.
export function motivoParaNoEnviar(vehiculosVinculados: number): string | null {
  if (vehiculosVinculados <= 0) {
    return null
  }
  return vehiculosVinculados === 1
    ? 'Tiene un vehículo vinculado: desvincúlalo en «Vehículos» antes de enviarlo.'
    : `Tiene ${String(vehiculosVinculados)} vehículos vinculados: desvincúlalos en «Vehículos» antes de enviarlo.`
}
