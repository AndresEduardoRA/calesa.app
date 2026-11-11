// API pública del módulo `agenda` para el servidor: lecturas, reglas y tipos. No exporta componentes: los de una pantalla salen por
// `pantallas/agenda.ts` (sólo `src/app`) y los del navegador por `client.ts`. La ficha CLAUDE.md de esta carpeta dice qué entra y qué sale.
export { leerAgenda, leerEvento, leerTarea } from './composicion'
export {
  CLASES_DE_AGENDA,
  claseDe,
  type AgendaDeRango,
  type ClaveDeClase,
  type EventoDeAgenda,
  type RecordatorioDeAgenda,
  type SubastaDeAgenda,
  type TareaDeAgenda,
} from './entities/agenda'
export { puedeDarTareaAOtro, puedeEditarEvento, puedeEditarTarea } from './entities/visibilidad'
export {
  leerClases,
  leerFecha,
  leerVista,
  rangoDe,
  VISTAS,
  type RangoDeAgenda,
  type Vista,
} from './entities/calendario'
export {
  leerIdDeUrl,
  rutaDeVinculo,
  type ClaveDeVinculo,
  type DetalleDeEvento,
  type DetalleDeTarea,
  type VinculosDeAgenda,
} from './entities/detalle'
