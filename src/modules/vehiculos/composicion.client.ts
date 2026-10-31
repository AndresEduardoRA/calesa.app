// Composición del módulo en el navegador: lo que un componente necesita de `infra/*.client.ts`.
// Separado de `composicion.ts` porque aquel importa `server-only`.
export { prepararFoto, subirFoto, type FotoPreparada } from './infra/fotos.client'
export { consultarFicha, descargarFoto } from './infra/apibara.client'
export { buscarCandidatos } from './infra/vehiculos-para-lead.client'
export { leerLoteDePapelera } from './infra/papelera.client'
export {
  leerFotosDelResumen,
  leerRelacionesDelResumen,
  leerVehiculoDelResumen,
} from './infra/resumen.client'
export { leerListaDelPanel } from './infra/panel-para-cotizar.client'
