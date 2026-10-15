import type { LimitesDeLectura } from '@/shared/lib/csv/leer'

// Lo que se admite de un archivo de importación.
export const LIMITES_DE_IMPORTACION: LimitesDeLectura = {
  bytes: 2 * 1024 * 1024,
  filas: 500,
  columnas: 60,
  celda: 2000,
}

// De a cuántas filas viaja cada lote. La base procesa cada una en su propia subtransacción: con 50 un
// lote tarda ~50 ms (`pnpm db:medir`), muy por debajo de los 8 s que corta `authenticated`.
export const FILAS_POR_LOTE = 50

// Cuántas filas de la vista previa se ven a la vez.
export const FILAS_POR_PAGINA_DE_PREVIA = 50
