// La entrada de CLIENTE del módulo `vehiculos`: lo que puede importar un Client Component de
// `app/` o de otro módulo (`@/modules/vehiculos/client`). Sólo componentes de cliente (o puros) y
// tipos de `entities/`. Nada de servidor: para eso está `index.ts`.
export { BadgeDeSituacion } from './features/listado/components/badge-de-situacion'
export {
  esquemaDeSituacion,
  etiquetaDeSituacion,
  SITUACIONES,
  type Situacion,
} from './entities/situacion'
export type { Vehiculo } from './entities/vehiculo'
// La importación total de `/datos` (9.06-4): valida cada fila con el mismo esquema del formulario y de la acción del alta.
export { validarVehiculo, type DatosDeVehiculo, type Fuentes } from './entities/esquema'
export { camposComunes, type CampoComun, type ClaveComun, type TipoComun } from './entities/comunes'
export { camposActivos, type CampoDeVehiculo, type CategoriaDeVehiculo } from './entities/campo'
export { claveDeAtributo } from './entities/formulario'
