// Los huecos del panel de la unidad del área `dinero` de `logistica` (6.01, llenada en 6.11-1): «Gastos», «Pagos» (6.11-2) y «Margen». Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
import type { HuecoDeLaUnidad } from '../entities/nucleo/hueco'
import {
  HuecoDeGastosDiferido,
  HuecoDeMargenDiferido,
  HuecoDePagosDiferido,
} from '../features/dinero/components/diferidos'

export const HUECOS_DE_DINERO_EN_LA_UNIDAD: readonly HuecoDeLaUnidad[] = [
  {
    clave: 'gastos',
    titulo: 'Gastos',
    // Los costos no se anuncian: sin la clave el bloque no se dibuja.
    permisos: ['logistica.gastos.ver'],
    regla: 'gastos',
    componente: HuecoDeGastosDiferido,
  },
  {
    clave: 'pagos',
    titulo: 'Pagos',
    // Lo cobrado no se anuncia: sin la clave el bloque no se dibuja.
    permisos: ['logistica.pagos.ver'],
    regla: 'pagos',
    componente: HuecoDePagosDiferido,
  },
  {
    clave: 'margen',
    titulo: 'Margen',
    permisos: ['logistica.margen.ver'],
    // El margen existe aunque el flujo apague `gastos` o `pagos` (D-margen).
    regla: null,
    componente: HuecoDeMargenDiferido,
  },
]
