import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import type {
  EtiquetasDeRevisiones,
  PaginaDeRevisiones,
  RevisionDeLaCotizacion,
} from '../../../entities/revisiones'

// Qué pide el panel mientras tanto: «Ver más», un salto de «Ir a una fecha» o volver a las más recientes. Uno a la vez: ninguno se adelanta a otro.
export type Pidiendo = 'mas' | 'salto' | 'volver' | null

// Lo que falló de un salto o de volver, para decirlo y repetirlo con «Reintentar» (`hasta` es el borde ya armado del salto).
export type Fallido = { clase: 'salto'; dia: string; hasta: string } | { clase: 'volver' }

// Lo leído de UNA versión de la cotización: `version` es su `actualizadoEn`. Si la cotización cambia (otro guardado, una recarga), lo leído era de otra y se olvida.
// `desde` es el día de «Ir a una fecha» (nulo = desde la más nueva). `error` es el del último pedido: sin leer es el de la primera página; leída, el de «Ver más», un salto o volver
// (lo leído y su `desde` se quedan, y `fallido` dice cuál de los dos últimos).
export type Estado = {
  version: string
  revisiones: RevisionDeLaCotizacion[]
  etiquetas: EtiquetasDeRevisiones
  siguiente: number | null
  desde: string | null
  leido: boolean
  pidiendo: Pidiendo
  error: ErrorApp | null
  fallido: Fallido | null
}

export const sinLeer = (version: string): Estado => ({
  version,
  revisiones: [],
  etiquetas: { nodos: new Map(), grupos: new Map() },
  siguiente: null,
  desde: null,
  leido: false,
  pidiendo: null,
  error: null,
  fallido: null,
})

export const caido = (): Resultado<PaginaDeRevisiones> =>
  fallo('inesperado', 'No se pudieron cargar las revisiones.')

// Suma una página a lo leído: sus filas al final y sus etiquetas a las que ya había.
export function juntar(antes: Estado, pagina: PaginaDeRevisiones): Estado {
  return {
    ...antes,
    revisiones: [...antes.revisiones, ...pagina.revisiones],
    etiquetas: {
      nodos: new Map([...antes.etiquetas.nodos, ...pagina.etiquetas.nodos]),
      grupos: new Map([...antes.etiquetas.grupos, ...pagina.etiquetas.grupos]),
    },
    siguiente: pagina.siguiente,
    leido: true,
    pidiendo: null,
    error: null,
    fallido: null,
  }
}

// Cambia lo leído por una página nueva (un salto, o volver): sólo sus filas y etiquetas, desde `desde`, sin error.
export function reemplazar(
  antes: Estado,
  pagina: PaginaDeRevisiones,
  desde: string | null,
): Estado {
  return {
    ...juntar({ ...antes, revisiones: [], etiquetas: sinLeer('').etiquetas }, pagina),
    desde,
  }
}
