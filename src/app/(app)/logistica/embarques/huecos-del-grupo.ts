import type { HuecoDelGrupo } from '@/modules/logistica'
import { HUECOS_DE_DINERO_EN_EL_GRUPO } from '@/modules/logistica/pantallas/dinero-grupo'
import { HUECOS_DE_DOCUMENTOS_EN_EL_GRUPO } from '@/modules/logistica/pantallas/documentos-grupo'
import { HUECOS_DE_MOVER_EN_EL_GRUPO } from '@/modules/logistica/pantallas/mover-grupo'
import { puede, type Permisos } from '@/shared/lib/permisos'

// Lo que las áreas `mover`, `documentos` y `dinero` llenan en el resumen de un grupo (6.01). Cada una declara los suyos en `pantallas/<área>-grupo.ts`; acá se unen, en este orden: mover,
// documentos y gastos. `transporte` no declara ninguno (D23: «Editar grupo» es un botón del resumen, 6.08-4).
export const HUECOS_DEL_GRUPO: readonly HuecoDelGrupo[] = [
  ...HUECOS_DE_MOVER_EN_EL_GRUPO,
  ...HUECOS_DE_DOCUMENTOS_EN_EL_GRUPO,
  ...HUECOS_DE_DINERO_EN_EL_GRUPO,
]

/**
 * Los huecos que se dibujan en el resumen de un grupo, en orden: los que piden algún permiso que la persona tenga **en algún origen** (o ninguno). Un grupo cruza orígenes y flujos, así que no
 * se mira ni la regla de flujo ni un origen (D27): la base vuelve a exigir el permiso por cada unidad al escribir, y el hueco lo dice si alguna no se puede.
 */
export function huecosDelGrupo(
  lista: readonly HuecoDelGrupo[],
  permisos: Permisos,
): HuecoDelGrupo[] {
  return lista.filter(
    (hueco) =>
      hueco.permisos.length === 0 || hueco.permisos.some((clave) => puede(permisos, clave)),
  )
}

/**
 * Quien puede editar el transporte de algún origen (o repuestos): es lo que `transporte_grupo_aplicar` pide antes de mirar unidad por unidad. Sirve sólo para dibujar «Editar grupo» y abrir su
 * panel; la base vuelve a exigirlo por cada unidad (D37).
 */
export function puedeEditarTransporte(permisos: Permisos): boolean {
  return puede(permisos, 'logistica.transporte.editar') || puede(permisos, 'repuestos.editar')
}
