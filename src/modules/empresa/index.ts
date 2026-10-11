// API pública del módulo `empresa`. Lo único que `app/` u otro módulo puede importar.
// Por ahora sólo la lectura mínima de los ajustes; los formularios de configuración, las monedas,
// los tipos de cambio y las integraciones llegan en su parte de la fase 1.
export { registroDisponible, type Ajustes } from './entities/ajustes'
export { getAjustes } from './infra/queries/ajustes'
