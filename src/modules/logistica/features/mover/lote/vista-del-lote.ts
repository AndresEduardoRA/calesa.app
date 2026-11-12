// Lo que dice la vista previa de un lote, unidad por unidad (6.04-3): puro, sin I/O. Vive en `features` porque dice sus motivos con las frases de `flujos` (una entidad de `logistica`
// no importa otro módulo).
import {
  motivoLegible,
  textoDeLoQueFalta,
  type VistaPreviaDeUnaUnidad,
} from '@/modules/flujos/client'

// La fase de la que salen las unidades del lote (la que se eligió), no la de destino.
export type FaseDelLote = { id: string; nombre: string }

/** «Lista», «Falta: BL aprobado.», «Ya no está en «B»» o el motivo del primer rechazo. */
export function lineaDeLaVista(vista: VistaPreviaDeUnaUnidad, fase: FaseDelLote): string {
  if (vista.faseActual !== fase.id) return `Ya no está en «${fase.nombre}»`
  if (vista.ok) return 'Lista'
  if (vista.faltan.length > 0) return textoDeLoQueFalta(vista.faltan)
  return motivoLegible(
    { codigo: vista.codigos[0] ?? null, motivo: vista.motivos[0] ?? null },
    { faltan: vista.faltan },
  )
}

/** Las unidades que pueden entrar: su vista dice que sí y siguen en la fase del lote. */
export function puedenDelLote(vistas: readonly VistaPreviaDeUnaUnidad[], faseId: string): string[] {
  return vistas.filter((v) => v.ok && v.faseActual === faseId).map((v) => v.vehiculoId)
}

/** Si la fase o la transición piden nota, la piden de todas (la nota es común). */
export function notaObligatoriaDelLote(vistas: readonly VistaPreviaDeUnaUnidad[]): boolean {
  return vistas.some((v) => v.notaObligatoria)
}

/** «Mover los 7 que pueden» / «Mover el 1 que puede». */
export function textoDelBotonDelLote(n: number): string {
  return n === 1 ? 'Mover el 1 que puede' : `Mover los ${String(n)} que pueden`
}

/** «Reintentar el 1» / «Reintentar los 2». */
export function textoDelReintento(n: number): string {
  return n === 1 ? 'Reintentar el 1' : `Reintentar los ${String(n)}`
}

/** «5 listas, 1 con faltas» / «1 lista». */
export function resumenDeLaVista(
  vistas: readonly VistaPreviaDeUnaUnidad[],
  faseId: string,
): string {
  const listas = puedenDelLote(vistas, faseId).length
  const sin = vistas.length - listas
  const dichas = `${String(listas)} ${listas === 1 ? 'lista' : 'listas'}`
  if (sin === 0) return dichas
  return `${dichas}, ${String(sin)} ${sin === 1 ? 'no puede' : 'no pueden'} entrar`
}
