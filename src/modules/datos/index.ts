// API pública del módulo `datos`. Lo único que `app/` u otro módulo puede importar.
// La ficha CLAUDE.md de esta carpeta dice qué entra y qué sale.

// Exportar todo (9.05-2): lo llama el route handler `POST /datos/exportar`. El pedido se valida con `esquemaDelPedido`.
export { exportarTodo } from './features/exportar/lecturas'
export {
  TOPE_DE_FILAS,
  esquemaDelPedido,
  type Pedido,
  type SalidaDeExportacionTotal,
} from './entities/exportacion'
