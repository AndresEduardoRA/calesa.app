// Composición del área `mover` de `logistica` en el navegador (6.04-2): lo que leen los huecos «Notas» e «Historial». La importa sólo su feature y ningún barril la reexporta (como
// `areas/dinero/composicion.client.ts`).
export { leerNotasDeLaUnidad, NO_SE_LEYERON_LAS_NOTAS } from '../../infra/mover/notas.client'
export {
  leerHistorialDeLaUnidad,
  NO_SE_LEYO_EL_HISTORIAL,
} from '../../infra/mover/historial.client'
