import type { Descartado, Estado, Faltante, Fuente } from './motor-contexto'
import { esquemaRecalculo } from './recalculo-esquema'

// El recálculo de la hoja (`cotizacion_evaluar()`, paso 4.13-2) en la forma que usa la pantalla. Todo lo que se busca por el id de un nodo es un `Map`: un id como
// «constructor» es legal y un objeto lo encontraría en su prototipo. Los `Map` cruzan de Server a Client Components tal cual.
export type RespuestaDeRecalculo = {
  valores: ReadonlyMap<string, number | string | null>
  estados: ReadonlyMap<string, Estado>
  fuentes: ReadonlyMap<string, Fuente>
  // `usd` es el total de la hoja (el «TOTAL DÓLARES»); null si algo falta.
  totales: { usd: number | null; bs: number | null; sumaUsd: number | null }
  faltantes: readonly Faltante[]
  descartados: readonly Descartado[]
  hayFaltantesOcultos: boolean
}

// La respuesta de la base ya en la forma que usa la pantalla, o nulo si no es lo que la base promete.
export function recalculoDesde(crudo: unknown): RespuestaDeRecalculo | null {
  const leida = esquemaRecalculo.safeParse(crudo)
  if (!leida.success) {
    return null
  }
  const r = leida.data
  return {
    valores: new Map(Object.entries(r.valores)),
    estados: new Map(Object.entries(r.estados)),
    fuentes: new Map(Object.entries(r.fuentes)),
    totales: { usd: r.totales.usd, bs: r.totales.bs, sumaUsd: r.totales.suma_usd },
    faltantes: r.faltantes,
    descartados: r.overrides_descartados ?? [],
    hayFaltantesOcultos: r.hay_faltantes_ocultos === true,
  }
}

// En qué anda el recálculo de la hoja. «Falla» no trae el mensaje de la base (puede nombrar un nodo que quien mira no ve): sólo si se arregla volviendo a pedir o hay
// que recargar la hoja (la fórmula cambió, la sesión venció o ya no hay permiso).
export type EstadoDeRecalculo =
  | { tipo: 'al_dia' | 'esperando' | 'recalculando' | 'sin_variante' }
  | { tipo: 'fallo'; recargar: boolean }

export const pideRecargar = (error: { codigo: string }): boolean =>
  error.codigo === 'regla' || error.codigo === 'sin_permiso' || error.codigo === 'no_autenticado'
