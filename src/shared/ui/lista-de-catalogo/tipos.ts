import type { AccionDeMenu } from '../lista'

export type Direccion = 'subir' | 'bajar'

// Una fila de un catálogo que la empresa configura (un origen del lead, un tipo de lead, un tipo de seguimiento): lo que la lista
// necesita para dibujarla. Cada módulo la arma desde lo suyo y decide qué lleva el «⋯» (`acciones`, ya filtradas y en su orden).
export type FilaDeCatalogo = {
  id: string
  nombre: string
  // Una clave del catálogo de iconos (`@/shared/lib/iconos`); nada si no tiene.
  icono: string | null
  activo: boolean
  // Lo que se dice junto al nombre, con texto (nunca sólo color): «Por defecto», «Prospecto».
  insignias: readonly string[]
  // Si algo lo usa: «Tiene leads» · «Sin leads».
  uso: string
  acciones: readonly AccionDeMenu[]
  puedeSubir: boolean
  puedeBajar: boolean
}
