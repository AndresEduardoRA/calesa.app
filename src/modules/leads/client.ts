// La entrada de CLIENTE del módulo `leads`: lo que puede importar un Client Component de `app/` o
// de otro módulo (`@/modules/leads/client`). Sólo reglas puras de `entities/` y tipos. Nada de
// servidor: para eso está `index.ts`.
export {
  CLAVES_RESERVADAS_DE_LEAD,
  soloCarteraPorTipo,
  valorDefectoVigente,
  type CampoDeLead,
  type DatoDeLaEmpresa,
  type DatosDeLaEmpresa,
} from './entities/campo'
// El alta rápida: el drawer «Nuevo lead» (se monta una vez, en el shell) y lo puro que otro
// Client Component puede querer: cómo se normaliza y se muestra un teléfono.
export { AltaDeLead } from './features/alta/components/alta-de-lead'
export type { ContextoDeAlta } from './entities/alta'
export { normalizarTelefono, telefonoParaMostrar } from './entities/telefono'
// Completar o reabrir un recordatorio propio, para el panel de la agenda (`?recordatorio=`): la RPC `recordatorio_completar` exige que sea de quien actúa y la
// action no decide permisos sobre `leads`.
export { completarRecordatorio } from './features/recordatorios/actions/completar-recordatorio'
// Qué busca un texto («Nombre o número»): la feature del buscador (la paleta del 7.13, el selector `#` del 7.10) lo pregunta antes de pedir nada; la base
// lo repite y manda (`_buscador_interpretar`).
export { interpretarBusqueda, MINIMO_DE_BUSQUEDA } from './entities/busqueda-de-leads'
// La importación total de `/datos` (9.06-4): convierte el archivo en el navegador con las mismas reglas que la importación de `/leads`
// (`prepararFilas` pasa cada fila por `validarAlta()`), así no hay un segundo juego de reglas para un lead.
export {
  prepararFilas,
  type EleccionParaTodoElArchivo,
  type FilaPreparada,
  type MotivoDeFila,
  type PedidoDeFila,
} from './entities/importacion/filas'
export {
  conDestino,
  emparejarColumnas,
  objetivosDeImportacion,
  objetivosSinColumna,
  type ObjetivoDeImportacion,
} from './entities/importacion/emparejar'
export { comparable, sinApostrofoDeFormula } from './entities/importacion/texto'
export { fechaHoraLocal, fechaIso } from './entities/importacion/convertir'
export type { ContextoDeImportacion } from './entities/importacion/contexto'
export type { TablaDePaises } from './entities/paises/resolver'
export { usePaises } from './features/telefono/hooks/use-paises'
