// El enlace de la sub-navegación de `/logistica` del área `aduana` de `logistica` (6.09-1): «Aduana», la lista de declaraciones. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
import { RUTAS } from '@/shared/lib/rutas'
import type { EnlaceDeLogistica } from '../entities/nucleo/enlaces'

export const ENLACE_DE_ADUANA: EnlaceDeLogistica | null = {
  titulo: 'Aduana',
  ruta: RUTAS.aduana,
  permiso: 'logistica.ver',
}
