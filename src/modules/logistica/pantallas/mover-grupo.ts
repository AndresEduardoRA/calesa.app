// Los huecos del resumen de un grupo del área `mover` de `logistica` (6.01, llenada en 6.04): «Mover el grupo», con «Marcar que llegó» para un contenedor. Sólo `src/app` importa este archivo
// (`.claude/rules/modulos.md`).
import type { HuecoDelGrupo } from '../entities/nucleo/grupo'
import { HuecoMoverElGrupoDiferido } from '../features/mover/components/diferidos'

export const HUECOS_DE_MOVER_EN_EL_GRUPO: readonly HuecoDelGrupo[] = [
  {
    clave: 'mover',
    titulo: 'Mover el grupo',
    // Mover lo decide cada cuenta con `flujos.mover` y la base; ver el grupo basta para ver el hueco.
    permisos: ['flujos.mover'],
    regla: 'transporte',
    componente: HuecoMoverElGrupoDiferido,
  },
]
