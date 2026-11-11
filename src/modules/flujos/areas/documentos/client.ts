// La API de cliente del área `documentos` de `flujos` (5.02, la llena el 5.09): los tipos, las constantes y las reglas puras del formulario.
// Sale por el `client.ts` de la raíz. Las actions de las cuatro escrituras se suman en el mismo archivo.
export {
  CLAVE_DEL_GRUPO,
  CLAVE_DEL_TIPO,
  DIAS_MAXIMOS,
  ETIQUETA_DE_FORMATO,
  FORMATOS_DE_DOCUMENTO,
  LARGO_MAXIMO_DE_LA_DESCRIPCION,
  LARGO_MAXIMO_DEL_NOMBRE,
  MODOS_DE_VENCIMIENTO,
  PANEL_EDITAR_TIPO,
  PANEL_ELIMINAR_TIPO,
  PANEL_NUEVO_TIPO,
  TEXTO_DE_MODO,
  TOPE_DE_TIPOS_POR_GRUPO,
  destinoDeTipo,
  textoDelUso,
  tipoEnUso,
} from '../../entities/documentos/tipo-de-documento'
export type {
  ClaveDeGrupo,
  DireccionDeTipo,
  FormatoDeDocumento,
  GrupoDeTipos,
  ModoDeVencimiento,
  RespuestaDeEliminar,
  TipoDeDocumento,
  UsoDeTipo,
} from '../../entities/documentos/tipo-de-documento'
export {
  BORRADOR_DE_TIPO_NUEVO,
  MENSAJES_DE_TIPO,
  borradorConModo,
  borradorDeTipo,
  cambiosParaGuardar,
  datosParaCrear,
  esCampoDeTipo,
  validarTipo,
} from '../../entities/documentos/formulario-de-tipo'
export type {
  BorradorDeTipo,
  CampoDeTipo,
  DatosDeTipo,
} from '../../entities/documentos/formulario-de-tipo'
