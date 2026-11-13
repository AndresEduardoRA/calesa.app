// API pública del módulo `datos`. Lo único que `app/` u otro módulo puede importar.
// La ficha CLAUDE.md de esta carpeta dice qué entra y qué sale.

// Exportar todo (9.05-2): lo llama el route handler `POST /datos/exportar`. El pedido se valida con `esquemaDelPedido`.
export { exportarTodo } from './features/exportar/lecturas'
export {
  TOPE_DE_FILAS,
  TOPE_POR_ENTIDAD,
  esquemaDelPedido,
  type Pedido,
  type SalidaDeExportacionTotal,
} from './entities/exportacion'
// La pantalla `/datos` (9.05-3): qué sección abre `?seccion=` y, desde el 9.06-4b, las pestañas (con «Importar» apagada sin permiso).
export { seccionDeDatos, seccionesDeDatos, type PestanaDeDatos } from './entities/secciones'
// La sección «Importar» (9.06-4b): qué puede importar cada quien (sólo dibuja: la acción y `importacion_crear` lo exigen) y a quién.
export {
  entidadElegida,
  opcionesDeImportar,
  origenElegido,
  puedeImportar,
  TOPE_DE_DESTINOS,
  type OpcionesDeImportar,
} from './entities/opciones-de-importar'
export { leerPersonasParaDestino, type PersonaDestino } from './composicion'
