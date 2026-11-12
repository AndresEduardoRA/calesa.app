import type { Resultado } from '@/shared/lib/errores'

// Lo que muestra una opción: su texto y, si lo hay, un apoyo (el VIN, el número).
export type OpcionDelBuscador = { id: string; titulo: string; apoyo?: string }

// El elegido: sólo su id se guarda; el título es para mostrarlo.
export type ElegidoDelBuscador = { id: string; titulo: string }

export type PropsDelBuscador = {
  valor: ElegidoDelBuscador | null
  alElegir: (elegido: ElegidoDelBuscador | null) => void
  etiqueta: string
  error?: string
  disabled?: boolean
}

// Las opciones para un texto, con la señal para cancelar. Nunca lanza.
export type Buscar = (texto: string, signal: AbortSignal) => Promise<Resultado<OpcionDelBuscador[]>>
