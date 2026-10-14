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
// El alta rápida: el drawer «Nuevo lead» (se monta una vez, en el shell) y lo puro que otro
// Client Component puede querer: cómo se normaliza y se muestra un teléfono.
export { AltaDeLead } from './features/alta/components/alta-de-lead'
export type { ContextoDeAlta } from './entities/alta'
export { normalizarTelefono, telefonoParaMostrar } from './entities/telefono'
