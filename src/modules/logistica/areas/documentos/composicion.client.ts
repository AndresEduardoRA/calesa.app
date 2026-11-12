// Composición del área `documentos` de `logistica` en el navegador (6.06-1 y 6.06-2): lo que lee el hueco «Documentos», los permisos de quien mira y la subida del archivo. La importa sólo su feature y ningún barril la reexporta (como
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
export { leerMisPermisos } from '../../infra/documentos/permisos.client'
export { MENSAJE_DE_SUBIDA_FALLIDA, subirDocumento } from '../../infra/documentos/subir.client'
