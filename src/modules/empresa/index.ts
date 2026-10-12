// API pública del módulo `empresa` para el servidor. Lo único que `app/` u otro módulo puede
// importar. Mezcla lecturas de servidor con componentes de cliente: lo importan los Server
// Components.

// Lo mínimo de la empresa en toda pantalla, también antes de ingresar
export { registroDisponible, type Ajustes } from './entities/ajustes'
export { getAjustes } from './composicion'

// Configuración › Empresa: marca, datos legales, región y políticas
export { leerAjustes, leerMonedasYTiposCambio } from './composicion'
export { zonasHorarias } from './entities/regional'
export { FormularioEmpresa } from './features/empresa/components/formulario-empresa'

// Monedas y tipos de cambio nombrados
export { getTiposCambio, leerHistorial } from './composicion'
export type { TipoCambio } from './entities/tipos-cambio'
export { MonedasYTiposCambio } from './features/tipos-cambio/components/monedas-y-tipos-cambio'
export { TiposCambioVigentes } from './features/tipos-cambio/components/tipos-cambio-vigentes'

// Integraciones: el interruptor, lo no secreto y si están prendidas
export { integracionActiva, leerIntegraciones } from './composicion'
export type { ClaveIntegracion } from './entities/integraciones'
export { Integraciones } from './features/integraciones/components/integraciones'
