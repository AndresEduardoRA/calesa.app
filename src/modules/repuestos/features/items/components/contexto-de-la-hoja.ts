import type { ColumnaEditable, ValorDeCelda } from '../../../entities/items/celda'
import type { CatalogosDeLaHoja, MonedaDeLaHoja } from '../../../entities/items/hoja'

// Lo que las filas necesitan de la hoja (8.09-2): si se edita, los catálogos y las monedas, lo que dijo cada celda al guardar y las funciones, **estables** (la `XCell` está en `memo`).
export type ContextoDeLaHoja = {
  editable: boolean
  catalogos: CatalogosDeLaHoja
  monedas: readonly MonedaDeLaHoja[]
  // La primera moneda activa: con ella se muestra el precio de un ítem sin moneda.
  monedaPorDefecto: string | null
  // El motivo de la última escritura de una celda, por `<ítem>:<columna>`.
  errores: Readonly<Record<string, string>>
  guardar: (itemId: string, columna: ColumnaEditable, valor: ValorDeCelda) => Promise<void>
  alConfirmarNumero: (id: string, valor: number | null) => void
  alReiniciar: (id: string) => void
  alPedirEliminar: (itemId: string) => void
}
