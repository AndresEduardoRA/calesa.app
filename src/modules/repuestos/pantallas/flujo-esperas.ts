// Los huecos del panel de la unidad que llena `repuestos` (8.13-3): «Repuestos», las esperas que destraban al vehículo. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`) y los suma a los
// de `logistica`. `repuestos` no importa `logistica`: el tipo del hueco se declara aquí con lo mínimo y es asignable al de `HuecoDeLaUnidad` (un componente que pide menos de la unidad).
import type { ComponentType } from 'react'
import type { ClavePermiso } from '@/shared/lib/permisos'
import { HuecoDeEsperasDiferido } from '../features/flujo/components/diferidos'

export type HuecoDeEsperasEnLaUnidad = {
  clave: string
  titulo: string
  permisos: readonly ClavePermiso[]
  regla: string | null
  componente: ComponentType<{ unidad: { id: string; faseId: string | null } }>
}

export const HUECOS_DE_ESPERAS_EN_LA_UNIDAD: readonly HuecoDeEsperasEnLaUnidad[] = [
  {
    clave: 'repuestos',
    titulo: 'Repuestos',
    permisos: ['repuestos.ver'],
    // El flujo de un vehículo nace con la regla `esperas` encendida: si la apagan no hay esperas que mostrar. Sin variante `repuesto`: el panel de un ítem no lo dibuja.
    regla: 'esperas',
    componente: HuecoDeEsperasDiferido,
  },
]
