import { parseAsString } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import {
  CLAVE_DE_NAVIERA,
  CLAVE_DE_PUERTO,
  PANEL_EDITAR_NAVIERA,
  PANEL_EDITAR_PUERTO,
  PANEL_NUEVA_NAVIERA,
  PANEL_NUEVO_PUERTO,
} from '../../../entities/transporte/catalogo'

// Las claves de URL del modal de cada catálogo de transporte (6.08-1). Los parámetros de `nuqs` son una constante por catálogo: no se arman en cada render.
export type PanelesDelCatalogo = {
  nuevo: string
  editar: string
  clave: string
  parametros: Record<string, typeof parseAsString>
}

export const PANELES_DE_PUERTO: PanelesDelCatalogo = {
  nuevo: PANEL_NUEVO_PUERTO,
  editar: PANEL_EDITAR_PUERTO,
  clave: CLAVE_DE_PUERTO,
  parametros: { [CLAVE_DE_PANEL]: parseAsString, [CLAVE_DE_PUERTO]: parseAsString },
}

export const PANELES_DE_NAVIERA: PanelesDelCatalogo = {
  nuevo: PANEL_NUEVA_NAVIERA,
  editar: PANEL_EDITAR_NAVIERA,
  clave: CLAVE_DE_NAVIERA,
  parametros: { [CLAVE_DE_PANEL]: parseAsString, [CLAVE_DE_NAVIERA]: parseAsString },
}
