import { formatearFecha, inicioDelDia } from '@/shared/lib/fechas'

// «Hoy» y `venceEl` son días del calendario (`YYYY-MM-DD`). Un documento que vence hoy aún vale, como en la base (`vence_el >= current_date`).

/** ¿Ya venció? Sólo con una fecha anterior a hoy. */
export function estaVencido(venceEl: string | null, hoy: string): boolean {
  return venceEl !== null && venceEl < hoy
}

/** Lo que se dice del vencimiento: nada, «Vence el 3 mar 2027» o «Vencido». */
export function textoDelVencimiento(venceEl: string | null, hoy: string): string | null {
  if (venceEl === null) {
    return null
  }
  if (estaVencido(venceEl, hoy)) {
    return 'Vencido'
  }
  // `inicioDelDia`: la fecha ancla a la medianoche de la empresa y ninguna zona la corre al día anterior.
  return `Vence el ${formatearFecha(inicioDelDia(venceEl))}`
}
