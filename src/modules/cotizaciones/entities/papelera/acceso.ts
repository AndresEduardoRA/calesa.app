// Quién abre la papelera de cotizaciones y quién restaura (4.24-2, P2 a y P10 del 4.24-1b). Lo decide la base; esto sólo elige qué se dibuja. Nada de
// React ni de Supabase.
import { puede, type Permisos } from '@/shared/lib/permisos'

// La abre quien puede enviar cotizaciones a la papelera en algún origen (editar, moderar o gestionar finales) o quien puede vaciarla: ve lo suyo o,
// con la clave de vaciarla, todo. Los lotes que le tocan los decide la base.
export function puedeAbrirLaPapeleraDeCotizaciones(permisos: Permisos): boolean {
  return (
    puede(permisos, 'cotizaciones.editar') ||
    puede(permisos, 'cotizaciones.moderar') ||
    puede(permisos, 'cotizaciones.final.gestionar') ||
    puede(permisos, 'cotizaciones.papelera.purgar')
  )
}

export function puedePurgarLaPapeleraDeCotizaciones(permisos: Permisos): boolean {
  return puede(permisos, 'cotizaciones.papelera.purgar')
}

// Restaura quien envió el lote o quien puede vaciar la papelera (P10): deshacer el propio envío no pide más.
export function puedeRestaurarElLote(lote: { esMio: boolean }, puedePurgar: boolean): boolean {
  return lote.esMio || puedePurgar
}
