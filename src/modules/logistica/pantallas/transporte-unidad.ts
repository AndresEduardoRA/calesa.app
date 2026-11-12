// Los huecos del panel de la unidad del área `transporte` de `logistica` (6.01, llenado en 6.08-2): «Transporte». Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
import type { HuecoDeLaUnidad } from '../entities/nucleo/hueco'
import { HuecoDeTransporteDiferido } from '../features/transporte/components/diferidos-del-hueco'

export const HUECOS_DE_TRANSPORTE_EN_LA_UNIDAD: readonly HuecoDeLaUnidad[] = [
  {
    clave: 'transporte',
    titulo: 'Transporte',
    permisos: ['logistica.ver'],
    // Se enciende sólo en los flujos que tienen la regla `transporte` activa.
    regla: 'transporte',
    // Un ítem no tiene origen ni flujo con reglas: ve el texto «Sigue al vehículo» con `repuestos.ver` (8.13-2).
    repuesto: { permisos: ['repuestos.ver'], regla: null },
    componente: HuecoDeTransporteDiferido,
  },
]
