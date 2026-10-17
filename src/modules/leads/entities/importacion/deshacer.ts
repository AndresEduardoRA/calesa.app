// Deshacer una importación (parte 8b): qué contesta la base, cómo se dice cada motivo por el que un lead
// se queda, y cuánto le queda al plazo de 24 horas. Sin I/O.
import { z } from 'zod'

// En el orden en que la base los mira (`_lead_motivo_para_deshacer`): un lead cuenta sólo en el primero.
export const MOTIVOS_PARA_QUEDARSE = [
  'papelera',
  'otra_persona',
  'compartido',
  'editado',
  'seguimientos',
  'recordatorios',
  'telefonos',
  'vehiculos',
  'oportunidades',
  'portal',
  'otros',
] as const

export type MotivoParaQuedarse = (typeof MOTIVOS_PARA_QUEDARSE)[number]

export const TEXTO_DEL_MOTIVO: Record<MotivoParaQuedarse, string> = {
  papelera: 'Ya estaba en la papelera',
  otra_persona: 'Ya lo tiene otra persona',
  compartido: 'Ya lo compartiste',
  editado: 'Ya lo editaste',
  seguimientos: 'Ya tiene seguimientos',
  recordatorios: 'Ya tiene recordatorios',
  telefonos: 'Ya tiene otros teléfonos',
  vehiculos: 'Ya tiene vehículos',
  oportunidades: 'Ya tiene oportunidades',
  portal: 'Ya tuvo acceso al portal',
  otros: 'Ya tiene registros en otras secciones',
}

// Lo que se quedó por un motivo: cuántos y de qué filas del archivo (nunca nombres ni teléfonos).
export type Quedaron = { motivo: MotivoParaQuedarse; cantidad: number; filas: number[] }

export type ResultadoDeDeshacer = {
  movidos: number
  quedaron: Quedaron[]
  // Ya no estaban: se habían purgado de la papelera.
  purgados: number
  // Ya estaba deshecha: es lo que contestó la primera vez.
  repetido: boolean
}

export const ESTADOS_DE_IMPORTACION = ['abierta', 'terminada', 'deshecha'] as const

// Una de «Tus importaciones recientes». Las fechas, como ISO.
export type ImportacionReciente = {
  id: string
  // Cuándo terminó (o su último lote, si quedó abierta).
  fecha: string
  venceEn: string
  estado: (typeof ESTADOS_DE_IMPORTACION)[number]
  creadas: number
  // Nulos si nunca se cerró: esas cuentas las deja el cierre.
  yaExistian: number | null
  rechazadas: number | null
  // Lo que el deshacer movería ahora; nulo si ya se deshizo.
  intactos: number | null
  resultado: Omit<ResultadoDeDeshacer, 'repetido'> | null
}

const esquemaDeQuedaron = z.object({
  motivo: z.enum(MOTIVOS_PARA_QUEDARSE),
  cantidad: z.number().int().min(0),
  filas: z.array(z.number().int()),
})

const esquemaDeResultado = z.object({
  movidos: z.number().int().min(0),
  quedaron: z.array(esquemaDeQuedaron),
  purgados: z.number().int().min(0),
})

const esquemaDeDeshacer = esquemaDeResultado.extend({ repetido: z.boolean() })

const esquemaDeReciente = z.object({
  id: z.guid(),
  fecha: z.string(),
  vence_en: z.string(),
  estado: z.enum(ESTADOS_DE_IMPORTACION),
  creadas: z.number().int().min(0),
  ya_existian: z.number().int().nullable(),
  rechazadas: z.number().int().nullable(),
  intactos: z.number().int().nullable(),
  resultado: esquemaDeResultado.nullable(),
})

// Lo que devolvió `leads_importacion_deshacer`, o nulo si no tiene la forma.
export function deshacerDesde(dato: unknown): ResultadoDeDeshacer | null {
  const leido = esquemaDeDeshacer.safeParse(dato)
  return leido.success ? leido.data : null
}

// Lo que devolvió `leads_importaciones_recientes`, o nulo si no tiene la forma.
export function recientesDesde(dato: unknown): ImportacionReciente[] | null {
  const leido = z.array(esquemaDeReciente).safeParse(dato)
  if (!leido.success) {
    return null
  }
  return leido.data.map((x) => ({
    id: x.id,
    fecha: new Date(x.fecha).toISOString(),
    venceEn: new Date(x.vence_en).toISOString(),
    estado: x.estado,
    creadas: x.creadas,
    yaExistian: x.ya_existian,
    rechazadas: x.rechazadas,
    intactos: x.intactos,
    resultado: x.resultado,
  }))
}

// Cuánto le queda al plazo, dicho corto: «23 h», «45 min»; nulo si ya venció.
export function tiempoQueQueda(venceEn: string, ahora: Date): string | null {
  const minutos = Math.ceil((new Date(venceEn).getTime() - ahora.getTime()) / 60_000)
  if (minutos <= 0) {
    return null
  }
  if (minutos < 60) {
    return `${String(minutos)} min`
  }
  return `${String(Math.floor(minutos / 60))} h`
}

// Si hay algo para deshacer ahora: no deshecha, en plazo y con algo intacto.
export function sePuedeDeshacer(reciente: ImportacionReciente, ahora: Date): boolean {
  return (
    reciente.estado !== 'deshecha' &&
    (reciente.intactos ?? 0) > 0 &&
    tiempoQueQueda(reciente.venceEn, ahora) !== null
  )
}

type Numero = (n: number) => string

const leads = (n: number) => (n === 1 ? 'lead' : 'leads')

// La confirmación: cuántos se moverán a la papelera, y que lo que ya cambió se queda.
export function textoDeConfirmacion(intactos: number, creadas: number, numero: Numero): string {
  const moveran = `Se ${intactos === 1 ? 'moverá' : 'moverán'} ${numero(intactos)} ${leads(intactos)} a la papelera, donde puedes restaurarlos.`
  const otros = creadas - intactos
  if (otros <= 0) {
    return moveran
  }
  return `${moveran} ${otros === 1 ? 'El otro ya cambió y se queda' : `Los otros ${numero(otros)} ya cambiaron y se quedan`}.`
}

// Cuántas filas se nombran antes de resumir el resto.
const FILAS_A_LA_VISTA = 8

// «filas 2, 5 y 9», o «filas 2, 3, … y 12 más».
export function filasDichas(filas: readonly number[], numero: Numero): string {
  const vistas = filas.slice(0, FILAS_A_LA_VISTA).map(numero)
  const resto = filas.length - vistas.length
  const palabra = filas.length === 1 ? 'fila' : 'filas'
  if (resto > 0) {
    return `${palabra} ${vistas.join(', ')} y ${numero(resto)} más`
  }
  if (vistas.length === 1) {
    return `${palabra} ${vistas[0] ?? ''}`
  }
  return `${palabra} ${vistas.slice(0, -1).join(', ')} y ${vistas.at(-1) ?? ''}`
}

// El titular del resultado: cuántos se movieron, o por qué no se movió ninguno.
export function titularDelDeshacer(
  resultado: Pick<ResultadoDeDeshacer, 'movidos' | 'quedaron'>,
  numero: Numero,
): string {
  const quedan = resultado.quedaron.reduce((suma, q) => suma + q.cantidad, 0)
  if (resultado.movidos === 0) {
    return quedan === 0
      ? 'No había leads para mover a la papelera.'
      : 'No se movió ningún lead: todos ya cambiaron.'
  }
  const movidos = `Se ${resultado.movidos === 1 ? 'movió' : 'movieron'} ${numero(resultado.movidos)} ${leads(resultado.movidos)} a la papelera.`
  return quedan === 0
    ? movidos
    : `${movidos} ${numero(quedan)} ${quedan === 1 ? 'se quedó' : 'se quedaron'} en tu cartera.`
}

// «Deshacer importación» en la URL de `/leads/importar` (`?panel=deshacer-importacion&importacion=<id>&desde=<superficie>`):
// dos lugares lo ofrecen, el resultado del asistente (la importación que acaba de terminar) y «Tus importaciones recientes»; si
// una importación está en los dos, `desde` dice cuál abre el diálogo (si no, se abrirían los dos).
export const PANEL_DESHACER_IMPORTACION = 'deshacer-importacion'
export const CLAVE_DE_IMPORTACION = 'importacion'
export const CLAVE_DE_SUPERFICIE = 'desde'
export const SUPERFICIE_DEL_RESULTADO = 'resultado'
export const SUPERFICIE_DE_LAS_RECIENTES = 'recientes'

// Por qué `?panel=deshacer-importacion` no abre desde «Tus importaciones recientes» (nulo = se puede): la importación no está
// entre las recientes, ya se deshizo, venció el plazo o no queda nada intacto. Se revisa una vez, al llegar.
export function motivoParaNoDeshacer(
  recientes: readonly ImportacionReciente[],
  importacionId: string | null,
  ahora: Date,
): string | null {
  const reciente = recientes.find((r) => r.id === importacionId)
  if (!reciente) {
    return 'Esa importación ya no está entre tus recientes.'
  }
  if (reciente.estado === 'deshecha') {
    return 'Esa importación ya se deshizo.'
  }
  return sePuedeDeshacer(reciente, ahora) ? null : 'Esa importación ya no se puede deshacer.'
}
