// La entrada de CLIENTE del módulo `origenes`: lo que puede importar un Client Component de
// `app/` o de otro módulo (`@/modules/origenes/client`). Sólo reglas puras de `entities/` y tipos:
// cómo se nombra un origen y lo que entra en él, para escribir «Ninguna unidad en Corea todavía»
// sin texto fijo. Nada de servidor: para eso está `index.ts`.
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
