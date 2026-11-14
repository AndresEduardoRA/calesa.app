// Lo que el panel de una unidad necesita para mover (6.04): dónde está, a dónde puede ir y qué le falta para cada destino. Todo sale de la base (`logistica_unidad`,
// las salidas de su fase y `previsualizar_cambio_fase`); aquí sólo se valida y se arma. Tipos y reglas puras, sin I/O.
import { z } from 'zod'
import { fallo, MENSAJE_INESPERADO, ok, type Resultado } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import type { UnidadAMover } from './unidad-a-mover'
import type { RequisitoVista, VistaPrevia } from './vista-previa'

/** Cuántos destinos se muestran como máximo: son salidas de una fase (configuración, no una lista que crece). La lectura pide uno más para saber si hay más. */
export const TOPE_DE_DESTINOS = 12

/** Lo más largo que puede ser la nota de un cambio de fase (la base no tiene tope: lo pone la interfaz). */
export const LARGO_MAXIMO_DE_LA_NOTA = 2000

/** Un lote mueve de 1 a 200 unidades (`cambiar_fase_lote`). */
export const TOPE_DEL_LOTE = 200

export type DestinoDeMover = {
  faseId: string
  nombre: string
  color: string
  orden: number
  // El texto del botón de la transición; nulo = «Mover».
  accion: string | null
  // Lo pide la transición (la fase puede pedirla también: eso lo dice la vista previa).
  notaDeLaTransicion: boolean
  // Es una fase de subasta (`fases.es_subasta`): «La ganamos» no la ofrece.
  esSubasta: boolean
}

export type DestinoConVista = DestinoDeMover & {
  vista: VistaPrevia | null
  errorDeLaVista: string | null
}

export type MovidaPorUltimaVez = {
  historialId: number
  nombre: string | null
  en: string
}

export type UnidadParaMover = {
  // El id de la unidad y su tipo (un vehículo o un ítem de repuesto, 8.13-1).
  tipo: UnidadAMover['tipo']
  unidadId: string
  faseId: string | null
  fueraDeRegla: boolean
  // Los bloqueantes sin cumplir de la fase actual (sólo si está fuera de regla).
  faltanEnSuFase: RequisitoVista[]
  movida: MovidaPorUltimaVez | null
}

export type ParaMover = {
  faseActualId: string | null
  fueraDeRegla: RequisitoVista[]
  destinos: DestinoConVista[]
  puedeMover: boolean
  hayMasDestinos: boolean
}

const esquemaDeUnidad = z.object({
  vehiculo_id: z.guid(),
  fase_id: z.guid().nullable(),
  fuera_de_regla: z.boolean(),
  faltan: z.array(
    z.object({
      requisito_id: z.guid(),
      tipo: z.enum(['documento', 'dato', 'espera']),
      descripcion: z.string(),
      detalle: z.record(z.string(), z.unknown()).nullable(),
    }),
  ),
  movida: z
    .object({
      historial_id: z.number(),
      nombre: z.string().nullable(),
      en: z.string(),
    })
    .nullable(),
})

/** Lo que devuelve `logistica_unidad`, o el error si no se puede confiar en la forma. */
export function unidadParaMoverDesde(dato: unknown): Resultado<UnidadParaMover> {
  const leida = esquemaDeUnidad.safeParse(dato)
  if (!leida.success) return fallo('inesperado', MENSAJE_INESPERADO)
  const u = leida.data
  return ok({
    tipo: 'vehiculo',
    unidadId: u.vehiculo_id,
    faseId: u.fase_id,
    fueraDeRegla: u.fuera_de_regla,
    faltanEnSuFase: u.faltan.map((f) => ({
      requisitoId: f.requisito_id,
      tipo: f.tipo,
      // `logistica_unidad` sólo trae los bloqueantes sin cumplir.
      bloqueante: true,
      cumplido: false,
      descripcion: f.descripcion,
      detalle: f.detalle ?? {},
    })),
    movida: u.movida
      ? { historialId: u.movida.historial_id, nombre: u.movida.nombre, en: u.movida.en }
      : null,
  })
}

const esquemaDeItem = z.object({ id: z.guid(), fase_id: z.guid().nullable() })

export const MENSAJE_REPUESTO_SIN_ACCESO =
  'Este repuesto ya no está disponible: no existe o ya no tienes acceso.'

/**
 * Un ítem de repuesto leído de `repuestos_items` bajo la RLS (`null` = no hay fila: no existe, está en la papelera o no se ve). `logistica_unidad` es sólo de vehículo (D3 de 8.13),
 * así que el ítem no trae «fuera de regla» ni «quién lo movió»: la franja no se dibuja y lo que sí se ve es la vista previa de cada destino.
 */
export function unidadDeRepuestoParaMover(fila: unknown): Resultado<UnidadParaMover> {
  if (fila === null) return fallo('no_encontrado', MENSAJE_REPUESTO_SIN_ACCESO)
  const leida = esquemaDeItem.safeParse(fila)
  if (!leida.success) return fallo('inesperado', MENSAJE_INESPERADO)
  return ok({
    tipo: 'repuesto',
    unidadId: leida.data.id,
    faseId: leida.data.fase_id,
    fueraDeRegla: false,
    faltanEnSuFase: [],
    movida: null,
  })
}

const esquemaDeDestino = z.object({
  id: z.guid(),
  nombre: z.string(),
  color: z.string(),
  orden: z.number(),
  es_subasta: z.boolean(),
})

const esquemaDeSalida = z.object({
  accion: z.string().nullable(),
  nota_obligatoria: z.boolean(),
  destino: esquemaDeDestino,
})

/** Las salidas de una fase (`fases_transiciones` con su fase destino): sólo las activas, en el orden de las fases. */
export function destinosDeSalidas(filas: unknown): Resultado<DestinoDeMover[]> {
  const leidas = z.array(esquemaDeSalida).safeParse(filas)
  if (!leidas.success) return fallo('inesperado', MENSAJE_INESPERADO)
  return ok(
    leidas.data
      .map((s) => ({
        faseId: s.destino.id,
        nombre: s.destino.nombre,
        color: s.destino.color,
        orden: s.destino.orden,
        accion: s.accion,
        notaDeLaTransicion: s.nota_obligatoria,
        esSubasta: s.destino.es_subasta,
      }))
      .sort((a, b) => a.orden - b.orden),
  )
}

/** Las fases iniciales de un flujo, para una unidad que todavía no tiene fase: se entra por una de ellas. */
export function destinosIniciales(filas: unknown): Resultado<DestinoDeMover[]> {
  const leidas = z.array(esquemaDeDestino).safeParse(filas)
  if (!leidas.success) return fallo('inesperado', MENSAJE_INESPERADO)
  return ok(
    leidas.data
      .map((f) => ({
        faseId: f.id,
        nombre: f.nombre,
        color: f.color,
        orden: f.orden,
        accion: null,
        notaDeLaTransicion: false,
        esSubasta: f.es_subasta,
      }))
      .sort((a, b) => a.orden - b.orden),
  )
}

export const MOTIVO_SIN_PERMISO_DE_MOVER = 'No tienes permiso para mover unidades de este origen.'
export const MOTIVO_SIN_PERMISO_DE_MOVER_UN_REPUESTO = 'No tienes permiso para mover repuestos.'

/** ¿Puede mover unidades de ese origen? La primera llave, por comodidad: la base vuelve a decidir (acceso, rol de la fase, requisitos). */
export function puedeMoverEn(permisos: Permisos, origenId: string): boolean {
  return (
    puede(permisos, 'flujos.mover', origenId) ||
    puede(permisos, 'flujos.mover.cualquiera', origenId)
  )
}

/** ¿Puede mover ítems de repuesto? Se mueven con `repuestos.mover` (global, no por origen) y nunca con `flujos.mover`; la base vuelve a decidir con los roles de la fase y de la transición. */
export function puedeMoverUnRepuesto(permisos: Permisos): boolean {
  return puede(permisos, 'repuestos.mover')
}
