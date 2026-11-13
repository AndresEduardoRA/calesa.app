// Los huecos del panel de la unidad del área `mover` de `logistica` (6.01, llenada en 6.04): «Qué falta» (abierto al inicio), «Notas» e «Historial» (plegados). Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
import type { HuecoDeLaUnidad } from '../entities/nucleo/hueco'
import {
  HuecoDeHistorialDiferido,
  HuecoDeNotasDiferido,
  HuecoQueFaltaDiferido,
} from '../features/mover/components/diferidos'

export const HUECOS_DE_MOVER_EN_LA_UNIDAD: readonly HuecoDeLaUnidad[] = [
  {
    clave: 'que-falta',
    titulo: 'Qué falta',
    // Ver el panel basta para ver lo que falta; mover lo decide cada botón con `flujos.mover` y la base.
    permisos: ['logistica.ver'],
    regla: null,
    repuesto: { permisos: ['repuestos.ver'], regla: null, componente: HuecoQueFaltaDiferido },
    abiertoAlInicio: true,
    componente: HuecoQueFaltaDiferido,
  },
  {
    clave: 'notas',
    titulo: 'Notas',
    // Quien ve la unidad escribe; la policy de `notas` pide lo mismo.
    permisos: ['logistica.ver'],
    regla: null,
    repuesto: { permisos: ['repuestos.ver'], regla: null, componente: HuecoDeNotasDiferido },
    componente: HuecoDeNotasDiferido,
  },
  {
    clave: 'historial',
    titulo: 'Historial',
    permisos: ['logistica.ver'],
    regla: null,
    repuesto: { permisos: ['repuestos.ver'], regla: null, componente: HuecoDeHistorialDiferido },
    componente: HuecoDeHistorialDiferido,
  },
]
