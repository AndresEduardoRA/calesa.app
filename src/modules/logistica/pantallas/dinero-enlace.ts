// El enlace de la sub-navegación de `/logistica` del área `dinero` de `logistica` (6.11-3): «Gastos», la lista de gastos y de pagos. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
import { RUTAS } from '@/shared/lib/rutas'
import type { EnlaceDeLogistica } from '../entities/nucleo/enlaces'

// El enlace lleva un solo permiso: quien sólo ve pagos entra por «Ver todos en Gastos» del hueco «Pagos» o por la URL, y la página lo atiende.
export const ENLACE_DE_DINERO: EnlaceDeLogistica | null = {
  titulo: 'Gastos',
  ruta: RUTAS.gastosDeLogistica,
  permiso: 'logistica.gastos.ver',
}
