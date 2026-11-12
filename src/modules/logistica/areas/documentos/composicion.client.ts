// Composición del área `documentos` de `logistica` en el navegador (6.06-1): lo que lee el hueco «Documentos». La importa sólo su feature y ningún barril la reexporta (como
// `areas/dinero/composicion.client.ts`).
export {
  leerDocumentosDeLaUnidad,
  NO_SE_CARGARON_LOS_DOCUMENTOS,
  TOPE_DE_DOCUMENTOS_DE_LA_UNIDAD,
  type DocumentosDeLaUnidad,
} from '../../infra/documentos/lista.client'
export {
  leerRequisitosDeDocumento,
  leerTiposDeLaUnidad,
  NO_SE_CARGARON_LOS_TIPOS,
} from '../../infra/documentos/tipos.client'
export { urlDelDocumento } from '../../infra/documentos/archivo.client'
