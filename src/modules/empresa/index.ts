// API pública del módulo `empresa` para el servidor: lecturas, reglas y tipos. Lo importan los Server
// Components y otros módulos. No exporta componentes (una pantalla paga en JS todo lo que reexporta lo que
// importa): los de Configuración › Empresa salen por `pantallas/configuracion-empresa.ts` (sólo `src/app`) y
// los del marco de toda pantalla, por `shell.ts`.

// Lo mínimo de la empresa en toda pantalla, también antes de ingresar
export { registroDisponible, type Ajustes } from './entities/ajustes'
export { getAjustes } from './composicion'

// Configuración › Empresa: marca, datos legales, región y políticas
export { leerAjustes, leerMonedasYTiposCambio } from './composicion'
export { huellaDelFormulario, type PoliticaDeLimpieza } from './entities/ajustes-empresa'
// La limpieza automática de vehículos de subasta: si está encendida y cuántos días de gracia. No
// tumba la pantalla (sin poder leerla, se da por apagada).
export { getPoliticaDeLimpieza } from './composicion'
export { zonasHorarias } from './entities/regional'

// Monedas y tipos de cambio nombrados
export { getTiposCambio, leerHistorial } from './composicion'
export type { TipoCambio } from './entities/tipos-cambio'

// Integraciones: el interruptor, lo no secreto y si están prendidas
export { integracionActiva, leerIntegraciones } from './composicion'
export type { ClaveIntegracion } from './entities/integraciones'

// Íconos de la app generados desde el logo
export { claveDeIconoVigente, iconosDelManifest, urlDeIcono } from './entities/iconos'
