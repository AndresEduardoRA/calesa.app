import type { ComponentType } from 'react'

import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'

import type { Unidad } from './unidad'

// Los huecos del panel de la unidad (6.01): lo que un área llena en el panel sin que el núcleo la importe. Cada área declara los suyos en
// `pantallas/<área>-unidad.ts` (vacío hasta su paso) y `src/app` los junta y los filtra con `huecosVisibles`. Un componente de hueco recibe sólo
// datos serializables (`{ unidad }`): el servidor decide si se dibuja y el componente es de cliente y carga lo suyo al abrirse el bloque.
export type HuecoDeLaUnidad = {
  // Una de `ORDEN_DE_HUECOS`: dice dónde va en el panel. Una desconocida no se dibuja.
  clave: string
  titulo: string
  // Se dibuja si la persona tiene ALGUNA, en el origen de la unidad. Vacío: basta el acceso al panel.
  permisos: readonly ClavePermiso[]
  // La regla de `flujos_reglas` que lo enciende (`transporte`, `aduana`, `gastos`, `pagos`…). Nula: no depende de una regla.
  regla: string | null
  // La variante para un ítem de repuesto (8.13-2): sin ella, el hueco no se dibuja para un ítem. Con ella, se filtra por estos permisos (sin origen: el flujo de repuestos no tiene) y esta regla.
  repuesto?: { permisos: readonly ClavePermiso[]; regla: string | null }
  componente: ComponentType<{ unidad: Unidad }>
  // El bloque nace abierto (y su contenido se pide al hidratar el panel). Los demás nacen plegados. Lo usa «Qué falta» (6.04), que es lo primero que se mira para mover.
  abiertoAlInicio?: boolean
}

/** El orden fijo del panel, sea cual sea el archivo que declara cada hueco. */
export const ORDEN_DE_HUECOS = [
  'que-falta',
  'documentos',
  'transporte',
  'repuestos',
  'aduana',
  'gastos',
  'pagos',
  'margen',
  'notas',
  'historial',
] as const

type ParaFiltrar = Pick<HuecoDeLaUnidad, 'clave' | 'permisos' | 'regla' | 'repuesto'>

/**
 * Los huecos que se dibujan, en el orden del panel: sin los de clave desconocida (o repetida: queda la primera), sin los que piden un permiso
 * que la persona no tiene en ese origen y sin los que piden una regla que el flujo del origen no tiene activa.
 */
export function huecosVisibles<H extends ParaFiltrar>(
  huecos: readonly H[],
  contexto: {
    permisos: Permisos
    origenId: string | null
    reglasActivas: readonly string[]
    // Qué unidad se abre: sin él, un vehículo (todo lo de antes). Un ítem sólo ve los huecos con variante `repuesto`.
    tipo?: Unidad['tipo']
  },
): H[] {
  const { permisos, origenId, reglasActivas, tipo = 'vehiculo' } = contexto
  const visibles = new Map<string, H>()
  for (const h of huecos) {
    // El filtro de tipo va antes de descartar repetidos: un hueco de vehículo no tapa al de repuesto de la misma clave.
    const reglas = tipo === 'repuesto' ? h.repuesto : h
    if (reglas === undefined) continue
    if (visibles.has(h.clave)) continue
    if (!(ORDEN_DE_HUECOS as readonly string[]).includes(h.clave)) continue
    if (reglas.permisos.length > 0 && !reglas.permisos.some((c) => puede(permisos, c, origenId)))
      continue
    if (reglas.regla !== null && !reglasActivas.includes(reglas.regla)) continue
    visibles.set(h.clave, h)
  }
  return ORDEN_DE_HUECOS.flatMap((c) => {
    const h = visibles.get(c)
    return h === undefined ? [] : [h]
  })
}
