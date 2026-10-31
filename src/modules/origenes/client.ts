// La entrada de CLIENTE del módulo `origenes`: lo que puede importar un Client Component de
// `app/` o de otro módulo (`@/modules/origenes/client`). Sólo reglas puras de `entities/` y tipos:
// cómo se nombra un origen y lo que entra en él, para escribir «Ninguna unidad en Corea todavía»
// sin texto fijo, y la forma de su layout de campos. Nada de servidor: para eso está `index.ts`.
export {
  articulo,
  concordar,
  contados,
  frasePorVacio,
  generoSugerido,
  ninguno,
  pluralDe,
} from './entities/nombre'
export type { Genero, OrigenResumen, TipoDeOrigen } from './entities/origen'
export { ETIQUETA_DE_TIPO_DE_ORIGEN } from './entities/origen'

// El layout de campos, para dibujar la ficha y el formulario de lo que entra por un origen.
export { agruparCampos, tieneOpciones } from './entities/campo'
export type {
  CampoDeLayout,
  GrupoDeCampos,
  OpcionDeCampo,
  TipoDeCampo,
  ValorDefecto,
} from './entities/campo'
export type { Categoria } from './entities/categoria'

// El layout activo de un origen, leído desde el navegador (el alta del panel del vehículo de la hoja de cotizar lo pide al abrirse).
export {
  useLayoutActivo,
  type LayoutActivo,
  type LayoutLeido,
} from './features/campos/hooks/use-layout-activo'
