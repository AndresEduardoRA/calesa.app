// El enlace de la sub-navegación de `/logistica` del área `transporte` de `logistica` (6.08-3): «Embarques», la lista de embarques y contenedores. Sólo `src/app` importa este archivo
// (`.claude/rules/modulos.md`).
import { RUTAS } from '@/shared/lib/rutas'
import type { EnlaceDeLogistica } from '../entities/nucleo/enlaces'

export const ENLACE_DE_TRANSPORTE: EnlaceDeLogistica | null = {
  titulo: 'Embarques',
  ruta: RUTAS.embarques,
  permiso: 'logistica.ver',
}
