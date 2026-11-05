import type { EntradasDelPedido } from './entradas'

// Guardar una cotización guardada es UNA llamada a `cotizacion_guardar()` (4.15-3). `intento` es uno nuevo por guardado, reusado sólo para reenviar **el mismo** pedido (4-21:
// la base devuelve lo guardado con `repetido`). `actualizadoEn` es la versión que vio quien edita, **el texto de la base tal cual**, con sus microsegundos: un `Date` de JS los
// pierde y la versión daría siempre conflicto. Título, notas y vehículo son los de la cotización, sin tocarlos (ninguna pantalla los escribe todavía; cambiar el vehículo es 4-71);
// el modo y «Ver total Bs» son los de la hoja, y las entradas, las que calculó el recálculo al día.
export type PedidoDeEdicion = {
  intento: string
  cotizacionId: string
  actualizadoEn: string
  entradas: EntradasDelPedido
  modoTc: string | null
  verTotalBs: boolean
  titulo: string | null
  notas: string | null
  vehiculoId: string | null
}

// Lo que arma la hoja con el total al día: todo menos el intento, que pone el guardado.
export type ArmadoDeEdicion = Omit<PedidoDeEdicion, 'intento'>

// Las nueve claves, siempre: la RPC no tiene valores por defecto y lee el nulo como «sin modo», «sin título», «sin notas» y «sin vehículo» (que, con el que ya tiene, es no tocarlo).
// Los tipos generados no admiten el nulo en un argumento sin defecto: de ahí los `as string`.
export function argumentosDeGuardar(p: PedidoDeEdicion) {
  return {
    p_id: p.cotizacionId,
    p_intento: p.intento,
    p_actualizado_en_esperado: p.actualizadoEn,
    p_entradas: p.entradas,
    p_modo_tc: p.modoTc as string,
    p_titulo: p.titulo as string,
    p_notas: p.notas as string,
    p_vehiculo: p.vehiculoId as string,
    p_ver_total_bs: p.verTotalBs,
  }
}
