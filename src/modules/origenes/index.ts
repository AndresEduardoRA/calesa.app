// API pública del módulo `origenes`. Lo único que `app/` u otro módulo puede importar.
// Por ahora sólo la lectura que otras pantallas necesitan para nombrar y elegir un origen; el
// CRUD, el layout de campos y las categorías llegan en la fase 2 (docs/PLAN.md).
export { getOrigenes } from './infra/queries/origenes'
export type { OrigenResumen } from './entities/origen'
