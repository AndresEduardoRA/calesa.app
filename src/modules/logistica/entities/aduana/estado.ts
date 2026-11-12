import { formatearFecha, sumarDias } from '@/shared/lib/fechas'
import { conteoEnFrase } from '@/shared/lib/conteo'

// Lo que la lista y el hueco de la unidad dicen de una declaración: si está pagada, qué falta y cuándo vencen los tributos (6.09-1). Puro: los textos salen de lo que la base calculó.

// La lista de la base cuenta hasta 201 vehículos (`limit 201`): 201 es «más de 200».
export const TOPE_DE_VEHICULOS_DE_LA_DECLARACION = 200

type Faltan = { pagada: boolean; faltan: number; vehiculos: number; hayOcultos: boolean }

/**
 * «Pagada», «Faltan los tributos de N» o «Sin vehículos» (D1). Si todo lo que se ve tiene su tributo pero hay unidades que no se ven y la base no la da por pagada, falta algo que
 * quien mira no puede nombrar: se dice. Nunca se calcula «pagada» acá.
 */
export function textoDeFaltan({ pagada, faltan, vehiculos, hayOcultos }: Faltan): string {
  if (pagada) {
    return 'Pagada'
  }
  if (faltan > 0) {
    const n = conteoEnFrase({
      n: Math.min(faltan, TOPE_DE_VEHICULOS_DE_LA_DECLARACION),
      hayMas: faltan > TOPE_DE_VEHICULOS_DE_LA_DECLARACION,
    })
    return hayOcultos
      ? `Faltan los tributos de ${n} y de unidades que no ves`
      : `Faltan los tributos de ${n}`
  }
  if (hayOcultos) {
    return 'Faltan los tributos de unidades que no ves'
  }
  return vehiculos === 0 ? 'Sin vehículos' : 'Faltan los tributos'
}

/** «un vehículo», «37 vehículos» o «más de 200 vehículos». */
export function textoDeUnidades(vehiculos: number): string {
  if (vehiculos === 1) {
    return '1 vehículo'
  }
  const hayMas = vehiculos > TOPE_DE_VEHICULOS_DE_LA_DECLARACION
  return `${conteoEnFrase({ n: Math.min(vehiculos, TOPE_DE_VEHICULOS_DE_LA_DECLARACION), hayMas })} vehículos`
}

export type TipoDeVencimiento = 'sin-fecha' | 'vencida' | 'por-vencer' | 'vigente'
export type Vencimiento = { tipo: TipoDeVencimiento; texto: string }

const DIAS_POR_VENCER = 7
/**
 * Cuándo vencen los tributos, en texto (D2). `hoy` es el día de la empresa, `AAAA-MM-DD`, ya calculado por quien llama: se comparan textos de fecha, nunca `Date`. Una declaración pagada
 * no se alarma: muestra su fecha como «vigente».
 */
export function vencimientoDe(
  venceTributosEl: string | null,
  hoy: string,
  pagada: boolean,
): Vencimiento {
  if (venceTributosEl === null) {
    return { tipo: 'sin-fecha', texto: 'Sin fecha de vencimiento' }
  }
  const fecha = `Vence el ${formatearFecha(venceTributosEl)}`
  if (pagada) {
    return { tipo: 'vigente', texto: fecha }
  }
  if (venceTributosEl < hoy) {
    return { tipo: 'vencida', texto: `Vencida el ${formatearFecha(venceTributosEl)}` }
  }
  if (venceTributosEl === hoy) {
    return { tipo: 'por-vencer', texto: 'Vence hoy' }
  }
  if (venceTributosEl === sumarDias(hoy, 1)) {
    return { tipo: 'por-vencer', texto: 'Vence mañana' }
  }
  for (let dias = 2; dias <= DIAS_POR_VENCER; dias += 1) {
    if (venceTributosEl === sumarDias(hoy, dias)) {
      return { tipo: 'por-vencer', texto: `Vence en ${String(dias)} días` }
    }
  }
  return { tipo: 'vigente', texto: fecha }
}
