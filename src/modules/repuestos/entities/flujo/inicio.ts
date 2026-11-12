// Lo que los bloques de Inicio muestran del flujo de repuestos (8.13-4): «Repuestos por mover» y «Esperas que destraban vehículos». Puro: valida las filas de la base y
// escribe los textos; la lectura es de `infra/flujo/inicio.ts`. Nunca un total: la lectura pide un ítem de más y `hayMas` lo dice.
import { z } from 'zod'
import { fechaRelativa } from '@/shared/lib/fechas'
import { fallo, MENSAJE_INESPERADO, ok, type Resultado } from '@/shared/lib/errores'
import { RUTAS } from '@/shared/lib/rutas'

/** El tope más alto que una lectura de Inicio acepta (el de un bloque es `TOPE_DE_BLOQUE`, 5). */
export const TOPE_DE_INICIO = 20

/** Las columnas de un ítem de Inicio, con su fase y su proyecto embebidos (ninguna lectura por fila). */
export const COLUMNAS_DE_INICIO =
  'id, descripcion, fase_desde, fase:fases!inner(nombre, es_final), proyecto:repuestos_proyectos!inner(id, numero, vehiculo_id, vehiculo_etiqueta, vehiculo:vehiculos(titulo))'

export type RepuestoDeInicio = {
  id: string
  descripcion: string
  // ISO: cuándo entró a su fase.
  faseDesde: string | null
  faseNombre: string
  proyecto: { id: string; numero: number; etiqueta: string | null }
}

const esquemaDeLaFila = z.object({
  id: z.guid(),
  descripcion: z.string(),
  fase_desde: z.string().nullable(),
  fase: z.object({ nombre: z.string(), es_final: z.boolean() }),
  proyecto: z.object({
    id: z.guid(),
    numero: z.number().int().min(0),
    vehiculo_id: z.guid().nullable(),
    vehiculo_etiqueta: z.string().nullable(),
    // El título del vehículo de un proyecto con vehículo (el proyecto no lo copia); nulo si quien mira no ve el vehículo (su RLS) o el proyecto es externo.
    vehiculo: z.object({ titulo: z.string() }).nullable(),
  }),
})

/** El tope de una lectura de Inicio: un entero de 1 a `TOPE_DE_INICIO`; otra cosa es un error de validación y no llega a la base. */
export function topeDeInicio(tope: number): Resultado<number> {
  if (!Number.isInteger(tope) || tope < 1 || tope > TOPE_DE_INICIO) {
    return fallo('validacion', `El tope va de 1 a ${String(TOPE_DE_INICIO)}.`)
  }
  return ok(tope)
}

/** Las filas de ítems como lo que dibuja Inicio, en el orden en que llegan; una fila que no cumple la forma es un error visible, no una fila a medias. */
export function repuestosDeInicioDesde(filas: unknown): Resultado<RepuestoDeInicio[]> {
  const leidas = z.array(esquemaDeLaFila).safeParse(filas)
  if (!leidas.success) return fallo('inesperado', MENSAJE_INESPERADO)
  return ok(
    leidas.data.map((f) => ({
      id: f.id,
      descripcion: f.descripcion,
      faseDesde: f.fase_desde,
      faseNombre: f.fase.nombre,
      proyecto: {
        id: f.proyecto.id,
        numero: f.proyecto.numero,
        etiqueta: f.proyecto.vehiculo?.titulo ?? f.proyecto.vehiculo_etiqueta,
      },
    })),
  )
}

type ContextoDeTexto = { zona: string; ahora: Date }

export function textoDeRepuestoPorMover(fila: RepuestoDeInicio): string {
  return fila.descripcion
}

/** «<fase> · Proyecto #<n> · en la fase <hace cuánto>» (sin lo último si no se sabe desde cuándo). */
export function detalleDeRepuestoPorMover(
  fila: RepuestoDeInicio,
  { zona, ahora }: ContextoDeTexto,
): string {
  const base = `${fila.faseNombre} · Proyecto #${String(fila.proyecto.numero)}`
  return fila.faseDesde === null
    ? base
    : `${base} · en la fase ${fechaRelativa(fila.faseDesde, { zona, ahora })}`
}

/** «<vehículo> · <descripción>»; sin título del vehículo (no se ve o es externo sin etiqueta), sólo la descripción. */
export function textoDeEsperaDeInicio(fila: RepuestoDeInicio): string {
  const etiqueta = fila.proyecto.etiqueta?.trim() ?? ''
  return etiqueta === '' ? fila.descripcion : `${etiqueta} · ${fila.descripcion}`
}

export function detalleDeEsperaDeInicio(fila: RepuestoDeInicio): string {
  return `${fila.faseNombre} · Proyecto #${String(fila.proyecto.numero)}`
}

/** La fila abre el panel del ítem sobre la hoja de su proyecto, donde «Qué falta» y los botones dicen si se puede mover. */
export function rutaDelItemDeInicio(fila: RepuestoDeInicio): string {
  return `${RUTAS.repuestos}/${fila.proyecto.id}?item=${fila.id}`
}
