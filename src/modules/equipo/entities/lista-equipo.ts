// La lista del equipo con tope (5a-21): qué se le pide a la base (texto y estado de la URL), qué devuelve y cómo se corta. La lista no se filtra en el
// navegador: `equipo_lista()` dice cuáles son las primeras por nombre y la página lee esas filas.
import { z } from 'zod'
import { cortarAlTope } from '@/shared/lib/conteo'
import { TOPE_DEL_EQUIPO } from '@/shared/lib/paginacion'
import {
  FILTROS_DE_ESTADO,
  personasDesde,
  type FiltroDeEstado,
  type PersonaDelEquipo,
} from './persona'

// Lo que la lista pide a la base: qué estados y qué texto (nombre o correo, sin importar tildes ni mayúsculas). Los dos viven en la URL (`?q=&estado=`).
export type FiltroDelEquipo = { texto: string; estado: FiltroDeEstado }

// Lo más largo que se busca; la base también lo corta (`equipo_lista()`).
export const LARGO_MAXIMO_DE_BUSQUEDA = 100

const esquemaFiltroDelEquipo = z.object({
  q: z
    .string()
    .catch('')
    .transform((texto) => [...texto.trim()].slice(0, LARGO_MAXIMO_DE_BUSQUEDA).join('')),
  // Un estado que no existe (una URL a mano) es el de siempre, «En el equipo»: sin error, como el selector.
  estado: z.enum(FILTROS_DE_ESTADO).catch('vigentes'),
})

export function filtroDelEquipoDesde(parametros: {
  q?: string | undefined
  estado?: string | undefined
}): FiltroDelEquipo {
  const { q, estado } = esquemaFiltroDelEquipo.parse(parametros)
  return { texto: q, estado }
}

// Los ids que devuelve `equipo_lista()` (a lo sumo `TOPE_DEL_EQUIPO + 1`, en el orden de la lista).
export function idsDelEquipoDesde(json: unknown): string[] {
  return z.array(z.guid()).parse(json)
}

// La lista que se dibuja: las primeras `tope` personas en el orden en que llegaron y si había más (se lee una de más: `cortarAlTope()`).
export type ListaDelEquipo = { personas: PersonaDelEquipo[]; hayMas: boolean }

export function listaDelEquipoDesde(filas: unknown, tope = TOPE_DEL_EQUIPO): ListaDelEquipo {
  const { filas: personas, hayMas } = cortarAlTope(personasDesde(filas), tope)
  return { personas, hayMas }
}
