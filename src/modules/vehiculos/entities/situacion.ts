// La situación real de un vehículo (`vehiculos.situacion`): una sola, que calcula la base a partir de su fase y de su subasta
// (`_vehiculo_situacion()`). La app nunca la calcula: la lee, la nombra y decide qué botones ofrece.
//   en_subasta   su subasta está viva y sigue en la fase de subasta (o sin fase en un origen con una);
//   sin_resolver la subasta cerró y nadie dijo si la ganamos: «La ganamos» / «No la ganamos»;
//   no_ganada    alguien la marcó así: deja de contar en logística, Inicio y el inventario por defecto;
//   fase         en cualquier otro caso: su situación es su fase.
import { z } from 'zod'
import { puede, type Permisos } from '@/shared/lib/permisos'

export const SITUACIONES = ['en_subasta', 'sin_resolver', 'no_ganada', 'fase'] as const

export type Situacion = (typeof SITUACIONES)[number]

// Una situación que la app no conoce no tumba la lista: se muestra la fase.
export const esquemaDeSituacion = z.enum(SITUACIONES).catch('fase')

export type TonoDeSituacion = 'fase' | 'info' | 'aviso' | 'apagado'

export type EtiquetaDeSituacion = { texto: string; tono: TonoDeSituacion }

// «No ganada» va en femenino porque concuerda con la subasta, no con el sustantivo del origen.
const TEXTO: Record<Exclude<Situacion, 'fase'>, EtiquetaDeSituacion> = {
  en_subasta: { texto: 'En subasta', tono: 'info' },
  sin_resolver: { texto: 'Sin resolver', tono: 'aviso' },
  no_ganada: { texto: 'No ganada', tono: 'apagado' },
}

// El texto y el tono de la insignia: con `fase`, el nombre de su fase (o «Sin fase»).
export function etiquetaDeSituacion(
  situacion: Situacion,
  fase: { nombre: string } | null,
): EtiquetaDeSituacion {
  if (situacion === 'fase') {
    return { texto: fase?.nombre ?? 'Sin fase', tono: 'fase' }
  }
  return TEXTO[situacion]
}

// Quién resuelve una subasta: quien puede mover de fase en el origen (`flujos.mover` o `.cualquiera`) y ve su logística,
// el mismo acceso que `cambiar_fase`. Lo vuelve a decidir la base (`vehiculo_subasta_ganada`, `vehiculo_subasta_no_ganada`).
export function puedeResolverLaSubasta(permisos: Permisos, origenId: string): boolean {
  return (
    (puede(permisos, 'flujos.mover', origenId) ||
      puede(permisos, 'flujos.mover.cualquiera', origenId)) &&
    puede(permisos, 'logistica.ver', origenId)
  )
}

export type AccionesDeSituacion = { laGanamos: boolean; noLaGanamos: boolean; deshacer: boolean }

// Qué botones ofrece el aviso de la ficha: resolver lo sin resolver, o deshacer una no ganada.
export function accionesDeSituacion({
  situacion,
  puede: puedeResolver,
}: {
  situacion: Situacion
  puede: boolean
}): AccionesDeSituacion {
  return {
    laGanamos: puedeResolver && situacion === 'sin_resolver',
    noLaGanamos: puedeResolver && situacion === 'sin_resolver',
    deshacer: puedeResolver && situacion === 'no_ganada',
  }
}

// Lo que el inventario pide siempre: sin las no ganadas (el filtro para verlas es aparte).
export const CONDICION_POR_DEFECTO = {
  tipo: 'situacion_fuera_de',
  valores: ['no_ganada'],
} as const satisfies { tipo: 'situacion_fuera_de'; valores: readonly Situacion[] }
