// API pública del módulo `leads` para el servidor. Con `client.ts`, lo único que `app/` u otro
// módulo puede importar. Lo importan los Server Components; un Client Component de afuera importa
// `@/modules/leads/client`.

// El layout de campos de los leads: lo que leen el alta, la ficha, el listado y los filtros.
// Trae todos los campos (también los desactivados): quien consume filtra `activo`.
export { leerLayoutDeLeads } from './composicion'
export {
  CLAVES_RESERVADAS_DE_LEAD,
  valorDefectoVigente,
  type CampoDeLead,
  type DatosDeLaEmpresa,
} from './entities/campo'

// Configuración › Leads › Campos
export { EditorDeCamposDeLead } from './features/campos/components/editor-de-campos-de-lead'
