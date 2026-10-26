import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { indiceDeHoja } from './entradas'
import type { HojaLista, HojaParaCotizar, HojaSinPublicar } from './hoja'
import { pideRecargar, type EstadoDeRecalculo, type RespuestaDeRecalculo } from './recalculo'

// Lo que se ve al abrir la hoja, a partir de las dos lecturas del servidor (`cotizacion_hoja()` y el primer `cotizacion_evaluar()`, que va DESPUÉS y con la hoja abierta que
// entregó la primera: 4-28).
export type RecalculoInicial = {
  respuesta: RespuestaDeRecalculo | null
  estado: EstadoDeRecalculo
}

export type Apertura =
  | { tipo: 'sin_permiso' }
  | { tipo: 'sin_publicar'; hoja: HojaSinPublicar }
  // Algo falló de verdad al leer la hoja: sube al `error.tsx` con «Reintentar».
  | { tipo: 'error'; error: ErrorApp }
  | { tipo: 'lista'; hoja: HojaLista; inicial: RecalculoInicial }

function inicialDe(hoja: HojaLista, recalculo: Resultado<RespuestaDeRecalculo>): RecalculoInicial {
  if (recalculo.ok) {
    return { respuesta: recalculo.data, estado: { tipo: 'al_dia' } }
  }
  // Una fórmula con variante y sin una por defecto no se calcula hasta que se elige (el motor falla): no es un error, es la primera elección.
  if (indiceDeHoja(hoja.secciones).variante?.porDefecto === null) {
    return { respuesta: null, estado: { tipo: 'sin_variante' } }
  }
  return {
    respuesta: null,
    estado: { tipo: 'fallo', recargar: pideRecargar(recalculo.error) },
  }
}

// Sólo el «sin permiso» de la hoja es sin permiso: el del recálculo es de un vehículo que no se ve (el servidor lo suelta antes). Sin hoja lista (sin permiso, sin publicar o un
// error) no hay nada que calcular y `recalculo` es nulo; una hoja lista con el cálculo nulo es un cálculo que no se hizo: «No se pudo recalcular».
export function aperturaDe(
  hoja: Resultado<HojaParaCotizar>,
  recalculo: Resultado<RespuestaDeRecalculo> | null,
): Apertura {
  if (!hoja.ok) {
    return hoja.error.codigo === 'sin_permiso'
      ? { tipo: 'sin_permiso' }
      : { tipo: 'error', error: hoja.error }
  }
  if (hoja.data.estado === 'sin_publicar') {
    return { tipo: 'sin_publicar', hoja: hoja.data }
  }
  return {
    tipo: 'lista',
    hoja: hoja.data,
    inicial: inicialDe(hoja.data, recalculo ?? fallo('inesperado', 'No se calculó la hoja.')),
  }
}
