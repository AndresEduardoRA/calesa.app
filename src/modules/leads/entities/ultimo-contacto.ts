// Lo último que pasó con un lead y lo próximo que quien mira se agendó, para el listado: el último seguimiento (con su tipo y su título si
// quien mira lo ve) y su próximo recordatorio pendiente. La base ya decidió qué llega (`leads_vista`: `ultimo_seguimiento_visible` y
// `proximo_recordatorio`); acá sólo se leen, se dicen en palabras relativas y se arma a dónde lleva cada uno. Cero I/O.
import { fechaRelativa } from '@/shared/lib/fechas'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { RUTAS } from '@/shared/lib/rutas'
import { z } from 'zod'
import { CLAVE_DE_SECCION } from './ficha'
import { CLAVE_DE_RECORDATORIO, PANEL_EDITAR_RECORDATORIO } from './recordatorios'

export type SeguimientoDeFila = { tipoId: string; titulo: string }
export type RecordatorioDeFila = { id: string; titulo: string; recordarEn: string }

// Un tipo de seguimiento tal como lo nombra el catálogo (`leads_catalogos()`), también los apagados: un seguimiento viejo conserva el suyo.
export type TipoDeSeguimientoEnCatalogo = {
  id: string
  nombre: string
  icono: string | null
  activo: boolean
}

export function tipoDeSeguimientoDelCatalogo(
  tipos: readonly TipoDeSeguimientoEnCatalogo[],
  id: string,
): TipoDeSeguimientoEnCatalogo | null {
  return tipos.find((tipo) => tipo.id === id) ?? null
}

// Una fila sin nada de esto: la que arma quien no lee del listado (la ficha, un test).
export const SIN_ULTIMO_CONTACTO = {
  ultimoSeguimientoEn: null,
  ultimoSeguimiento: null,
  proximoRecordatorio: null,
} as const

const esquemaSeguimiento = z.object({ tipo_id: z.guid(), titulo: z.string() })
const esquemaRecordatorio = z.object({
  id: z.guid(),
  titulo: z.string(),
  recordar_en: z.string(),
})

// El `jsonb` de la vista: nulo si no hay (o no se ve); una forma rota también es nula, no tumba la fila.
export function seguimientoDeFilaDesde(crudo: unknown): SeguimientoDeFila | null {
  const leido = esquemaSeguimiento.safeParse(crudo)
  return leido.success ? { tipoId: leido.data.tipo_id, titulo: leido.data.titulo } : null
}

export function recordatorioDeFilaDesde(crudo: unknown): RecordatorioDeFila | null {
  const leido = esquemaRecordatorio.safeParse(crudo)
  return leido.success
    ? { id: leido.data.id, titulo: leido.data.titulo, recordarEn: leido.data.recordar_en }
    : null
}

type Contexto = { ahora: Date; zona: string }

// «hace 3 días», «hace 1 día», «hace 2 horas»; pasada una semana, la fecha (`fechaRelativa`).
export function textoDelUltimoSeguimiento(en: string, { ahora, zona }: Contexto): string {
  return fechaRelativa(en, { ahora, zona, numerico: true })
}

// «en 2 días», «en 1 día»; vencido (su hora ya pasó), «vencido hace 1 día». `vencido` pide resaltarlo.
export function textoDelRecordatorio(
  recordarEn: string,
  { ahora, zona }: Contexto,
): { texto: string; vencido: boolean } {
  const vencido = Date.parse(recordarEn) <= ahora.getTime()
  const relativo = fechaRelativa(recordarEn, { ahora, zona, numerico: true })
  return vencido
    ? { texto: `vencido ${relativo}`, vencido }
    : { texto: relativo.replace(/^dentro de /, 'en '), vencido }
}

// Un clic en el seguimiento: la ficha abierta en sus seguimientos.
export function rutaDelSeguimientoDeFila(leadId: string): string {
  return `${RUTAS.leads}/${leadId}?${CLAVE_DE_SECCION}=seguimientos`
}

// Un clic en el recordatorio: se abre en la ficha, sobre el lead, si está en la cartera de quien mira; si no (lo perdió, y el recordatorio
// sigue siendo suyo), en la agenda, como el aviso de su hora.
export function rutaDelRecordatorioDeFila(
  leadId: string,
  enCartera: boolean,
  recordatorioId: string,
): string {
  if (!enCartera) {
    return `/agenda?${CLAVE_DE_RECORDATORIO}=${recordatorioId}`
  }
  const consulta = new URLSearchParams({
    [CLAVE_DE_SECCION]: 'seguimientos',
    [CLAVE_DE_PANEL]: PANEL_EDITAR_RECORDATORIO,
    [CLAVE_DE_RECORDATORIO]: recordatorioId,
  })
  return `${RUTAS.leads}/${leadId}?${consulta.toString()}`
}
