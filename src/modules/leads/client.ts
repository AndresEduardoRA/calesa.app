// La entrada de CLIENTE del módulo `leads`: lo que puede importar un Client Component de `app/` o
// de otro módulo (`@/modules/leads/client`). Sólo reglas puras de `entities/` y tipos. Nada de
// servidor: para eso está `index.ts`.
export {
  CLAVES_RESERVADAS_DE_LEAD,
  soloCarteraPorTipo,
  valorDefectoVigente,
  type CampoDeLead,
  type DatoDeLaEmpresa,
  type DatosDeLaEmpresa,
} from './entities/campo'
