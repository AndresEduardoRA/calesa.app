// Los cambios que hace el editor sobre una plantilla (4.19-3b): funciones puras e inmutables que devuelven otra. Una etiqueta o una leyenda en blanco quita la clave
// (una etiqueta pide 1 carácter y una leyenda vacía es lo mismo que sin leyenda); un diccionario que queda vacío se quita; sin nota o sin tono, sin la clave.
import { btrim } from './json-de-la-base'
import type { Plantilla } from './forma-de-plantilla'

type Diccionario = Readonly<Record<string, string>>

// Con `Object.fromEntries`: un id `__proto__` queda como clave propia. La clave que ya estaba conserva su lugar.
function conEntrada(
  d: Diccionario | undefined,
  id: string,
  texto: string,
): Diccionario | undefined {
  const vacio = btrim(texto) === ''
  const actuales = Object.entries(d ?? {})
  const entradas: [string, string][] = actuales.some(([k]) => k === id)
    ? actuales.flatMap(([k, v]): [string, string][] =>
        k !== id ? [[k, v]] : vacio ? [] : [[k, texto]],
      )
    : vacio
      ? actuales
      : [...actuales, [id, texto]]
  return entradas.length === 0 ? undefined : Object.fromEntries(entradas)
}

function sinClave<K extends keyof Plantilla>(p: Plantilla, clave: K): Omit<Plantilla, K> {
  return Object.fromEntries(Object.entries(p).filter(([k]) => k !== clave)) as Omit<Plantilla, K>
}

function conDiccionario(
  p: Plantilla,
  clave: 'etiquetas' | 'leyendas',
  d: Diccionario | undefined,
): Plantilla {
  return d === undefined ? sinClave(p, clave) : { ...p, [clave]: d }
}

export function conTonoDelGrupo(p: Plantilla, grupo: string, tono: string | null): Plantilla {
  return {
    ...p,
    grupos: p.grupos.map((g) => {
      if (g.grupo !== grupo) return g
      return tono === null || tono === '' ? { grupo: g.grupo } : { grupo: g.grupo, tono }
    }),
  }
}

export const conEtiqueta = (p: Plantilla, id: string, texto: string): Plantilla =>
  conDiccionario(p, 'etiquetas', conEntrada(p.etiquetas, id, texto))

export const conLeyenda = (p: Plantilla, id: string, texto: string): Plantilla =>
  conDiccionario(p, 'leyendas', conEntrada(p.leyendas, id, texto))

// La leyenda del total en blanco quita la clave; la etiqueta se escribe tal cual (la forma pide 1 carácter y lo dice el campo).
export function conTotal(p: Plantilla, cambio: { etiqueta?: string; leyenda?: string }): Plantilla {
  const etiqueta = cambio.etiqueta ?? p.total.etiqueta
  const leyenda = cambio.leyenda === undefined ? p.total.leyenda : cambio.leyenda
  return {
    ...p,
    total: leyenda === undefined || btrim(leyenda) === '' ? { etiqueta } : { etiqueta, leyenda },
  }
}

export const conNota = (p: Plantilla, texto: string): Plantilla =>
  btrim(texto) === '' ? sinClave(p, 'nota') : { ...p, nota: texto }

export const conLogo = (p: Plantilla, logo: boolean): Plantilla => ({ ...p, logo })

export const conColumna = (
  p: Plantilla,
  columna: 'leyenda' | 'plazo' | 'tipo_cambio',
  valor: boolean,
): Plantilla => ({ ...p, columnas: { ...p.columnas, [columna]: valor } })
