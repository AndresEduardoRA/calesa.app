// Lo que frena apagar una regla (`flujo_regla_impacto()`): las fases y los requisitos que la usan, dicho con texto y con el enlace a su inspector.
import { z } from 'zod'
import { cortarAlTope } from '@/shared/lib/conteo'
import { formatearNumero } from '@/shared/lib/formato'
import { RUTAS } from '@/shared/lib/rutas'
import { CLAVE_DE_REPUESTOS } from '../selector-de-flujos'

export const TOPE_DEL_IMPACTO = 50

export type ImpactoDeRegla = {
  bloquea: boolean
  fases: { id: string; nombre: string }[]
  requisitos: { id: string; faseId: string; faseNombre: string }[]
  // Había más que el tope: se lee una de más.
  hayMas: boolean
}

const cruda = z.object({
  bloquea: z.boolean(),
  fases: z.array(z.object({ id: z.guid(), nombre: z.string() })),
  requisitos: z.array(z.object({ id: z.guid(), fase: z.guid(), fase_nombre: z.string() })),
})

// La respuesta de la RPC, o nulo si no se entiende.
export function impactoDesde(crudo: unknown): ImpactoDeRegla | null {
  const r = cruda.safeParse(crudo)
  if (!r.success) {
    return null
  }
  const fases = cortarAlTope(r.data.fases, TOPE_DEL_IMPACTO)
  const requisitos = cortarAlTope(r.data.requisitos, TOPE_DEL_IMPACTO)
  return {
    bloquea: r.data.bloquea,
    fases: fases.filas,
    requisitos: requisitos.filas.map((q) => ({
      id: q.id,
      faseId: q.fase,
      faseNombre: q.fase_nombre,
    })),
    hayMas: fases.hayMas || requisitos.hayMas,
  }
}

function lista(nombres: readonly string[]): string {
  const entre = nombres.map((n) => `«${n}»`)
  if (entre.length <= 1) {
    return entre.join('')
  }
  return `${entre.slice(0, -1).join(', ')} y ${entre[entre.length - 1]}`
}

// «No se puede apagar «Aduana»: la usa la fase «En aduana».»
export function textoDelImpacto(nombreDeLaRegla: string, impacto: ImpactoDeRegla): string {
  const cabeza = `No se puede apagar «${nombreDeLaRegla}»:`
  const tope = formatearNumero(TOPE_DEL_IMPACTO)
  if (impacto.fases.length > 0) {
    const nombres = impacto.fases.map((f) => f.nombre)
    if (impacto.hayMas) {
      return `${cabeza} la usan más de ${tope} fases.`
    }
    return nombres.length === 1
      ? `${cabeza} la usa la fase ${lista(nombres)}.`
      : `${cabeza} la usan las fases ${lista(nombres)}.`
  }
  const n = impacto.requisitos.length
  const fases = [...new Set(impacto.requisitos.map((q) => q.faseNombre))]
  const dePara = fases.length === 1 ? `fase ${lista(fases)}` : `fases ${lista(fases)}`
  if (impacto.hayMas) {
    return `${cabeza} la usan más de ${tope} requisitos de espera (${dePara}).`
  }
  return n === 1
    ? `${cabeza} la usa 1 requisito de espera (${dePara}).`
    : `${cabeza} la usan ${n} requisitos de espera (${dePara}).`
}

// El inspector de una fase: la pestaña «Fases» del flujo (`?origen=` o `?ambito=repuestos`) con `?fase=`.
export function hrefDeFase(claveDelFlujo: string, faseId: string): string {
  const flujo =
    claveDelFlujo === CLAVE_DE_REPUESTOS
      ? `ambito=${CLAVE_DE_REPUESTOS}`
      : `origen=${encodeURIComponent(claveDelFlujo)}`
  return `${RUTAS.configuracionDeFlujos}?seccion=fases&${flujo}&fase=${encodeURIComponent(faseId)}`
}
