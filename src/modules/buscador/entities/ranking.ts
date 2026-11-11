// Qué secciones busca un texto, cómo se ordena y agrupa lo que llega y los «Últimos abiertos» (7.12). Puro. La interpretación del texto la hace la
// feature que compone con `interpretarBusqueda()` de `@/modules/leads/client` (una regla de `entities` no importa otro módulo); aquí llega con su
// forma (`Interpretacion`). La base repite el mínimo (`_buscador_interpretar`) y manda: esto sólo evita pedidos inútiles y ordena.
import { cortarAlTope } from '@/shared/lib/conteo'
import type { FilaPorTipo, TipoDelBuscador, Visita } from './resultados'

export { TIPOS_DEL_BUSCADOR, type TipoDelBuscador } from './resultados'

// Lo que el código pide a cada RPC `buscador_*`: el `defecto` de `_acotar_pagina(p_tamano, 5, 20)` (registrado en
// `scripts/guardas/areas-b/paginas-en-la-base.ts`). Es el tope de una sección, no una página de lista (D21).
export const POR_SECCION = 5

// «Últimos abiertos»: se leen 16 visitas y se muestran 8, para que una oculta o purgada no deje la lista corta (D15).
export const ULTIMOS_LEIDOS = 16
export const ULTIMOS_MOSTRADOS = 8

// La forma de lo que devuelve `interpretarBusqueda()`; `null` = bajo el mínimo, no se pide nada.
export type Interpretacion = { texto: string; numero: number | null; soloNumero: boolean } | null

export type LeidasPorTipo = { [T in TipoDelBuscador]?: readonly FilaPorTipo[T][] }
export type SeccionDe<T extends TipoDelBuscador> = {
  tipo: T
  filas: FilaPorTipo[T][]
  hayMas: boolean
}
export type Seccion = { [T in TipoDelBuscador]: SeccionDe<T> }[TipoDelBuscador]
export type AbiertoDe<T extends TipoDelBuscador> = { tipo: T; fila: FilaPorTipo[T] }
export type Abierto = { [T in TipoDelBuscador]: AbiertoDe<T> }[TipoDelBuscador]

// Espejo de `_buscador_interpretar` y D10: `#n` (o un número corto) busca leads y cotizaciones, nunca vehículos; un número de 3 o más dígitos sin `#`
// es también un texto (título, VIN o lote).
export function seccionesQueBuscan(interpretacion: Interpretacion): readonly TipoDelBuscador[] {
  if (interpretacion === null) {
    return []
  }
  if (interpretacion.soloNumero) {
    return ['lead', 'cotizacion']
  }
  return interpretacion.numero !== null
    ? ['lead', 'cotizacion', 'vehiculo']
    : ['lead', 'vehiculo', 'cotizacion']
}

const ETIQUETAS: { [T in TipoDelBuscador]: (fila: FilaPorTipo[T]) => readonly (string | null)[] } =
  {
    lead: (fila) => [fila.nombre],
    vehiculo: (fila) => [fila.titulo, fila.vin, fila.lote],
    cotizacion: (fila) => [fila.titulo],
  }

const NUMEROS: { [T in TipoDelBuscador]: (fila: FilaPorTipo[T]) => number | null } = {
  lead: (fila) => fila.numero_visible,
  vehiculo: () => null,
  cotizacion: (fila) => fila.numero,
}

// 0 · el número exacto; 1 · una palabra de la etiqueta empieza con el texto (sin mayúsculas y sin plegar tildes, como `ilike`); 2 · el resto.
function nivel(
  interpretacion: NonNullable<Interpretacion>,
  numero: number | null,
  etiquetas: readonly (string | null)[],
): number {
  if (interpretacion.numero !== null && numero === interpretacion.numero) {
    return 0
  }
  if (!interpretacion.soloNumero) {
    const buscado = interpretacion.texto.toLocaleLowerCase('es')
    const empieza = etiquetas.some((etiqueta) => {
      const minusculas = (etiqueta ?? '').toLocaleLowerCase('es')
      return minusculas.startsWith(buscado) || minusculas.includes(` ${buscado}`)
    })
    if (empieza) {
      return 1
    }
  }
  return 2
}

function seccionDe<T extends TipoDelBuscador>(
  tipo: T,
  interpretacion: NonNullable<Interpretacion>,
  leidas: readonly FilaPorTipo[T][],
): SeccionDe<T> {
  // Orden estable: en un empate queda el de la base (lo más nuevo primero).
  const ordenadas = leidas
    .map((fila, i) => ({
      fila,
      i,
      nivel: nivel(interpretacion, NUMEROS[tipo](fila), ETIQUETAS[tipo](fila)),
    }))
    .sort((a, b) => a.nivel - b.nivel || a.i - b.i)
    .map((x) => x.fila)
  return { tipo, ...cortarAlTope(ordenadas, POR_SECCION) }
}

function seccionDelTipo(
  tipo: TipoDelBuscador,
  interpretacion: NonNullable<Interpretacion>,
  leidas: LeidasPorTipo,
): Seccion {
  switch (tipo) {
    case 'lead':
      return seccionDe('lead', interpretacion, leidas.lead ?? [])
    case 'vehiculo':
      return seccionDe('vehiculo', interpretacion, leidas.vehiculo ?? [])
    case 'cotizacion':
      return seccionDe('cotizacion', interpretacion, leidas.cotizacion ?? [])
  }
}

// Las secciones en el orden de `seccionesQueBuscan`, sin las vacías ni la que no busca, cada una cortada en `POR_SECCION` (cada RPC devuelve una de más).
export function agruparResultados(
  interpretacion: Interpretacion,
  leidas: LeidasPorTipo,
): Seccion[] {
  if (interpretacion === null) {
    return []
  }
  return seccionesQueBuscan(interpretacion)
    .map((tipo) => seccionDelTipo(tipo, interpretacion, leidas))
    .filter((seccion) => seccion.filas.length > 0)
}

// `leads_vista_por_ids` no conserva el orden de los ids: se ordena como ellos. Sale la fila que no se pidió y el id que no llegó.
export function ordenarComoLosIds<F extends { id: string }>(
  ids: readonly string[],
  filas: readonly F[],
): F[] {
  const porId = new Map(filas.map((fila) => [fila.id, fila]))
  return ids.flatMap((id) => {
    const fila = porId.get(id)
    return fila ? [fila] : []
  })
}

function abiertoDe(visita: Visita, hidratadas: LeidasPorTipo): Abierto | null {
  const buscar = <F extends { id: string }>(filas: readonly F[] | undefined) =>
    filas?.find((fila) => fila.id === visita.referencia_id)
  switch (visita.tipo) {
    case 'lead': {
      const fila = buscar(hidratadas.lead)
      return fila ? { tipo: 'lead', fila } : null
    }
    case 'vehiculo': {
      const fila = buscar(hidratadas.vehiculo)
      return fila ? { tipo: 'vehiculo', fila } : null
    }
    case 'cotizacion': {
      const fila = buscar(hidratadas.cotizacion)
      return fila ? { tipo: 'cotizacion', fila } : null
    }
  }
}

// Una lista mezclada por recencia (`visto_en desc`), sin grupos. La entidad que no llegó (no se ve, papelera o purgada) sale sin marcador: no se
// distingue de una que no existe (D17).
export function ultimosAbiertos(visitas: readonly Visita[], hidratadas: LeidasPorTipo): Abierto[] {
  return visitas
    .flatMap((visita) => {
      const abierto = abiertoDe(visita, hidratadas)
      return abierto ? [abierto] : []
    })
    .slice(0, ULTIMOS_MOSTRADOS)
}
