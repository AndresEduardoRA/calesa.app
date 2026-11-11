import { diaEnZona } from '@/shared/lib/fechas'

const MS_POR_DIA = 86_400_000

/** Los días de calendario (en la zona de la empresa) que lleva la unidad en su fase. Nunca negativo; `null` si no se sabe desde cuándo. */
export function diasEnLaFase(faseDesde: string | null, ahora: Date = new Date()): number | null {
  if (faseDesde === null) return null
  const desde = Date.parse(diaEnZona(faseDesde))
  const hasta = Date.parse(diaEnZona(ahora.toISOString()))
  if (Number.isNaN(desde) || Number.isNaN(hasta)) return null
  return Math.max(0, Math.round((hasta - desde) / MS_POR_DIA))
}

/** La línea del panel: «Entró hoy a esta fase», «Desde hace 1 día en esta fase», «Desde hace 3 días en esta fase». Nada si no se sabe. */
export function textoDeDiasEnLaFase(
  faseDesde: string | null,
  ahora: Date = new Date(),
): string | null {
  const dias = diasEnLaFase(faseDesde, ahora)
  if (dias === null) return null
  if (dias === 0) return 'Entró hoy a esta fase'
  return `Desde hace ${dias} ${dias === 1 ? 'día' : 'días'} en esta fase`
}
