// Las marcas de quien mira sobre un lead: favorito, tachado y sus etiquetas. Son privadas de cada
// persona (compartir el lead no las comparte) y se ponen por RPC con «poner(valor)», nunca
// alternando: repetir un pedido no cambia el resultado. La base las entrega ya recortadas a las
// de quien mira (`leads_vista`, `lead_ficha()`).
import { z } from 'zod'

export type MarcasDeLead = {
  esFavorito: boolean
  estaTachado: boolean
  // Ids de las etiquetas de quien mira puestas en el lead.
  etiquetas: string[]
}

export const SIN_MARCAS: MarcasDeLead = { esFavorito: false, estaTachado: false, etiquetas: [] }

// Cómo se dice el estado en la pantalla (texto, nunca sólo un ícono o un estilo).
export const ETIQUETA_DE_FAVORITO = 'Favorito'
export const ETIQUETA_DE_TACHADO = 'Tachado'

// Lo que llega de la base: columnas de `leads_vista` o claves de `lead_ficha()`. Un nulo es «no».
const esquemaMarcas = z.object({
  es_favorito: z.boolean().nullable().optional(),
  esta_tachado: z.boolean().nullable().optional(),
  etiquetas: z.array(z.guid()).nullable().optional(),
})

export function marcasDesde(crudo: unknown): MarcasDeLead {
  const leidas = esquemaMarcas.safeParse(crudo)
  if (!leidas.success) {
    return SIN_MARCAS
  }
  const m = leidas.data
  return {
    esFavorito: m.es_favorito === true,
    estaTachado: m.esta_tachado === true,
    etiquetas: m.etiquetas ?? [],
  }
}

export type ResultadoDeMarca = 'puesto' | 'quitado' | 'sin_cambios'

// La respuesta de `lead_favorito_poner` y `lead_tachado_poner`.
const esquemaRespuestaDeMarca = z.object({
  resultado: z.enum(['puesto', 'quitado', 'sin_cambios']),
  valor: z.boolean(),
})

export function respuestaDeMarcaDesde(
  crudo: unknown,
): { resultado: ResultadoDeMarca; valor: boolean } | null {
  const leida = esquemaRespuestaDeMarca.safeParse(crudo)
  return leida.success ? leida.data : null
}

// La respuesta de `lead_etiquetas_poner`: cómo quedaron las etiquetas de quien mira en el lead.
const esquemaRespuestaDeEtiquetas = z.object({
  resultado: z.enum(['puesto', 'quitado', 'sin_cambios']),
  etiquetas: z.array(z.guid()),
})

export function respuestaDeEtiquetasDelLeadDesde(
  crudo: unknown,
): { resultado: ResultadoDeMarca; etiquetas: string[] } | null {
  const leida = esquemaRespuestaDeEtiquetas.safeParse(crudo)
  return leida.success ? leida.data : null
}

// Lo que se ve mientras viaja el pedido (y se revierte si falla).
export function conFavorito(marcas: MarcasDeLead, valor: boolean): MarcasDeLead {
  return { ...marcas, esFavorito: valor }
}

export function conTachado(marcas: MarcasDeLead, valor: boolean): MarcasDeLead {
  return { ...marcas, estaTachado: valor }
}

export function conEtiquetaPuesta(marcas: MarcasDeLead, id: string, valor: boolean): MarcasDeLead {
  const sin = marcas.etiquetas.filter((una) => una !== id)
  return { ...marcas, etiquetas: valor ? [...sin, id] : sin }
}

// Una firma para saber si las marcas que trae el servidor cambiaron (y descartar lo local).
export function firmaDeMarcas(marcas: MarcasDeLead): string {
  return `${marcas.esFavorito ? 1 : 0}${marcas.estaTachado ? 1 : 0}:${[...marcas.etiquetas].sort().join(',')}`
}
