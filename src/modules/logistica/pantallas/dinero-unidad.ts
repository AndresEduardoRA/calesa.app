// Los huecos del panel de la unidad del área `dinero` de `logistica` (6.01, llenada en 6.11-1): «Gastos». «Pagos» y «Margen» llegan después. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
import type { HuecoDeLaUnidad } from '../entities/nucleo/hueco'
import { HuecoDeGastosDiferido } from '../features/dinero/components/diferidos'

export const HUECOS_DE_DINERO_EN_LA_UNIDAD: readonly HuecoDeLaUnidad[] = [
  {
    clave: 'gastos',
    titulo: 'Gastos',
    // Los costos no se anuncian: sin la clave el bloque no se dibuja.
    permisos: ['logistica.gastos.ver'],
    regla: 'gastos',
    componente: HuecoDeGastosDiferido,
  },
]
