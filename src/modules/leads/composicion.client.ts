// Composición del módulo en el navegador: lo que un componente necesita de `infra/*.client.ts`.
// Separado de `composicion.ts` porque aquel importa `server-only`.
export { leerLeadRapido } from './infra/lead-rapido.client'
export { leerFichaDelLead } from './infra/ficha.client'
export { leerCatalogosDeEdicion } from './infra/catalogos-de-edicion.client'
export {
  leerMasSeguimientos,
  leerSeguimiento,
  leerTiposDeSeguimiento,
} from './infra/seguimientos.client'
export { leerPaginaDeRecordatorios, leerRecordatorio } from './infra/recordatorios.client'
export { leerEtiquetasConUso } from './infra/etiquetas.client'
export { leerCandidatosDeCartera } from './infra/cartera.client'
export { leerPaginaDeEtapa } from './infra/embudo.client'
export { leerAccesoDelCliente } from './infra/portal.client'
export { leerLoteDePapelera } from './infra/papelera.client'
