// API pública del módulo `origenes` para el servidor: lecturas, reglas y tipos. Con `client.ts`, lo único que
// `app/` u otro módulo puede importar. No exporta componentes (una pantalla paga en JS todo lo que reexporta lo
// que importa): los de Configuración › Orígenes salen por `pantallas/origenes.ts` y `pantallas/origen.ts` (sólo
// `src/app`). Un Client Component de afuera importa `@/modules/origenes/client`.

// Los orígenes para nombrarlos y elegirlos (selectores, la matriz de roles)
export { getOrigenes } from './composicion'
export type { OrigenResumen } from './entities/origen'

// El layout de un origen para quien lo consume: la ficha, los filtros y el alta de `vehiculos`.
// `leerLayout()` trae todos los campos (también los desactivados) y las categorías.
export { leerDatosNuevosDeApibara, leerLayout } from './composicion'
export { agruparCampos, tieneOpciones } from './entities/campo'
export type {
  CampoDeLayout,
  GrupoDeCampos,
  OpcionDeCampo,
  TipoDeCampo,
  ValorDefecto,
} from './entities/campo'
export type { Categoria } from './entities/categoria'
export type { LayoutDeOrigen } from './entities/repositorios'

// Configuración › Orígenes: lo que lee la lista y el detalle de un origen
export { leerOrigenes } from './composicion'
export type { OrigenConUso } from './entities/origen'

// Qué le falta a un origen para funcionar
export {
  pasosDe,
  type ClaveDePaso,
  type PasoConDestino,
  type PasoSiguiente,
} from './entities/pasos'
