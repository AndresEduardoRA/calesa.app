import { HUECOS_DE_ADUANA_EN_LA_UNIDAD } from '@/modules/logistica/pantallas/aduana-unidad'
import { HUECOS_DE_DINERO_EN_LA_UNIDAD } from '@/modules/logistica/pantallas/dinero-unidad'
import { HUECOS_DE_DOCUMENTOS_EN_LA_UNIDAD } from '@/modules/logistica/pantallas/documentos-unidad'
import { HUECOS_DE_MOVER_EN_LA_UNIDAD } from '@/modules/logistica/pantallas/mover-unidad'
import { HUECOS_DE_TRANSPORTE_EN_LA_UNIDAD } from '@/modules/logistica/pantallas/transporte-unidad'
import { HUECOS_DE_ESPERAS_EN_LA_UNIDAD } from '@/modules/repuestos/pantallas/flujo-esperas'
import { huecosVisibles, type HuecoDeLaUnidad, type Unidad } from '@/modules/logistica'
import type { Resultado } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'

// Lo que las áreas `mover`, `documentos`, `transporte`, `aduana` y `dinero`, y `repuestos` (el hueco «Repuestos», 8.13-3) llenan en el panel de la unidad (6.01). Cada una declara los suyos en su archivo de `pantallas/`
// (hoy vacíos). El orden en el panel lo da `ORDEN_DE_HUECOS`, no esta lista.
export const HUECOS_DE_LA_UNIDAD: readonly HuecoDeLaUnidad[] = [
  ...HUECOS_DE_MOVER_EN_LA_UNIDAD,
  ...HUECOS_DE_DOCUMENTOS_EN_LA_UNIDAD,
  ...HUECOS_DE_TRANSPORTE_EN_LA_UNIDAD,
  // El de `repuestos` declara su propio tipo (un módulo no importa a otro) y su componente pide menos de la unidad; `ComponentType` no lo admite por `defaultProps`: el cast va aquí (D9, 8.13-3).
  ...(HUECOS_DE_ESPERAS_EN_LA_UNIDAD as readonly HuecoDeLaUnidad[]),
  ...HUECOS_DE_ADUANA_EN_LA_UNIDAD,
  ...HUECOS_DE_DINERO_EN_LA_UNIDAD,
]

export const AVISO_SIN_REGLAS =
  'No pudimos leer el flujo de este origen: algunas secciones no se muestran. Recarga la página.'

type Contexto = {
  unidad: Pick<Unidad, 'origenId'> & { tipo?: Unidad['tipo'] }
  permisos: Permisos
  // El flujo del origen de la unidad: sólo importan las reglas activas. `null`: el origen no tiene flujo.
  flujo: Resultado<{ reglasActivas: readonly string[] } | null>
}

/**
 * Los huecos que se dibujan en el panel de esa unidad, en orden, y el aviso si no se pudo leer el flujo. Una lectura fallida deja las reglas apagadas: los huecos que
 * piden una regla no se dibujan y el resto sí. Quien no tiene el permiso del hueco en el origen de la unidad no lo ve.
 */
export function huecosDeLaUnidad(
  lista: readonly HuecoDeLaUnidad[],
  { unidad, permisos, flujo }: Contexto,
): { huecos: HuecoDeLaUnidad[]; aviso: string | null } {
  const reglasActivas = flujo.ok ? (flujo.data?.reglasActivas ?? []) : []
  return {
    huecos: huecosVisibles(lista, {
      permisos,
      origenId: unidad.origenId,
      reglasActivas,
      tipo: unidad.tipo,
    }),
    aviso: flujo.ok ? null : AVISO_SIN_REGLAS,
  }
}
