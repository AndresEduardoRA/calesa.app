// Los huecos del panel de la unidad del área `aduana` de `logistica` (6.01, llenado en 6.09-1): «Aduana». Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
import type { HuecoDeLaUnidad } from '../entities/nucleo/hueco'
import { HuecoDeAduanaDiferido } from '../features/aduana/components/diferidos'

export const HUECOS_DE_ADUANA_EN_LA_UNIDAD: readonly HuecoDeLaUnidad[] = [
  {
    clave: 'aduana',
    titulo: 'Aduana',
    permisos: ['logistica.ver'],
    // Se enciende sólo en los flujos que tienen la regla `aduana` activa.
    regla: 'aduana',
    componente: HuecoDeAduanaDiferido,
  },
]
