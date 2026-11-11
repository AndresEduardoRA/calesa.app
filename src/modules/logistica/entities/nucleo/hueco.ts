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
  componente: ComponentType<{ unidad: Unidad }>
}

/** El orden fijo del panel, sea cual sea el archivo que declara cada hueco. */
export const ORDEN_DE_HUECOS = [
  'que-falta',
  'documentos',
  'transporte',
  'aduana',
  'gastos',
  'pagos',
  'margen',
  'notas',
  'historial',
] as const

type ParaFiltrar = Pick<HuecoDeLaUnidad, 'clave' | 'permisos' | 'regla'>

/**
 * Los huecos que se dibujan, en el orden del panel: sin los de clave desconocida (o repetida: queda la primera), sin los que piden un permiso
 * que la persona no tiene en ese origen y sin los que piden una regla que el flujo del origen no tiene activa.
 */
export function huecosVisibles<H extends ParaFiltrar>(
  huecos: readonly H[],
  contexto: { permisos: Permisos; origenId: string; reglasActivas: readonly string[] },
): H[] {
  const { permisos, origenId, reglasActivas } = contexto
  const visibles = new Map<string, H>()
  for (const h of huecos) {
    if (visibles.has(h.clave)) continue
    if (!(ORDEN_DE_HUECOS as readonly string[]).includes(h.clave)) continue
    if (h.permisos.length > 0 && !h.permisos.some((c) => puede(permisos, c, origenId))) continue
    if (h.regla !== null && !reglasActivas.includes(h.regla)) continue
    visibles.set(h.clave, h)
  }
  return ORDEN_DE_HUECOS.flatMap((c) => {
    const h = visibles.get(c)
    return h === undefined ? [] : [h]
  })
}
