// Los huecos del panel de la unidad del área `mover` de `logistica` (6.01, llenada en 6.04): «Qué falta». Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
import type { HuecoDeLaUnidad } from '../entities/nucleo/hueco'
import { HuecoQueFaltaDiferido } from '../features/mover/components/diferidos'

export const HUECOS_DE_MOVER_EN_LA_UNIDAD: readonly HuecoDeLaUnidad[] = [
  {
    clave: 'que-falta',
    titulo: 'Qué falta',
    // Ver el panel basta para ver lo que falta; mover lo decide cada botón con `flujos.mover` y la base.
    permisos: ['logistica.ver'],
    regla: null,
    abiertoAlInicio: true,
    componente: HuecoQueFaltaDiferido,
  },
]
