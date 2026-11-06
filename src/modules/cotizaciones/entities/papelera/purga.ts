// Cuándo se purga lo que está en la papelera de cotizaciones (4.24-2): el job la vacía cuando vence `creado_en + papelera_dias` del lote.
const UN_DIA = 86_400_000

// Días enteros que faltan; cero = ya venció y lo toma la próxima pasada del job.
export function diasParaLaPurga(purgaEl: string, ahora: string): number {
  const faltan = (new Date(purgaEl).getTime() - new Date(ahora).getTime()) / UN_DIA
  return faltan > 0 ? Math.ceil(faltan) : 0
}

export function textoDePurga(dias: number): string {
  if (dias <= 0) {
    return 'Se purga en la próxima pasada'
  }
  return dias === 1 ? 'Se purga mañana' : `Se purga en ${String(dias)} días`
}
