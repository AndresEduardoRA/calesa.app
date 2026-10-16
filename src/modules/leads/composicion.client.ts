// Composición del módulo en el navegador: lo que un componente necesita de `infra/*.client.ts`.
// Separado de `composicion.ts` porque aquel importa `server-only`.
export { leerLeadRapido } from './infra/lead-rapido.client'
export { leerMasSeguimientos, leerTiposDeSeguimiento } from './infra/seguimientos.client'
export { leerRecordatoriosDelLead } from './infra/recordatorios.client'
export { leerEtiquetasConUso } from './infra/etiquetas.client'
export { leerCandidatosDeCartera } from './infra/cartera.client'
export { leerPaginaDeEtapa } from './infra/embudo.client'
export { leerAccesoDelCliente } from './infra/portal.client'
