import type { VistaDeGrupos } from '../../../entities/transporte/paneles'

// Lo que la lista de grupos necesita de los catálogos para nombrar naviera y puertos (id y nombre).
export type CatalogosParaNombrar = {
  navieras: readonly { id: string; nombre: string }[]
  puertos: readonly { id: string; nombre: string }[]
}

export type PropsDeLaFila = {
  vista: VistaDeGrupos
  catalogos: CatalogosParaNombrar
  alAbrir: (clave: string) => void
  abierto: string | null
}
