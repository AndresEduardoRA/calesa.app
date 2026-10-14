// «Míos» y «todos» en el listado de leads. Lo que cada persona ve lo decide la RLS de `leads`
// (`alcance_de('leads.ver')` y la cartera); esto sólo dice qué modo ofrece la pantalla y, con él,
// la condición `en_cartera` que se le suma a la consulta. Nunca amplía lo que da la base.
import { alcanceDe, type Permisos } from '@/shared/lib/permisos'

export const CLAVE_DE_ALCANCE = 'alcance'
export const VALOR_TODOS = 'todos'

export type ModoDelListado = 'mios' | 'todos'

export type AlcanceDelListado = {
  // Tiene `leads.ver` con alcance «todos»: sólo a esa persona se le ofrece el selector.
  puedeVerTodos: boolean
  modo: ModoDelListado
}

// El modo por defecto es «míos». «Todos» sólo cuando se pidió (`?alcance=todos`) y se puede: con
// «propios» el parámetro se ignora. Con «ver como», `permisos` son los efectivos de ese rol.
export function alcanceDelListado(
  permisos: Permisos,
  parametro: string | undefined,
): AlcanceDelListado {
  const puedeVerTodos = alcanceDe(permisos, 'leads.ver') === 'todos'
  return { puedeVerTodos, modo: puedeVerTodos && parametro === VALOR_TODOS ? 'todos' : 'mios' }
}
