import { diasEnLaFase } from '../nucleo/dias-en-la-fase'

/** La línea de la tarjeta: «Entró hoy», «1 día en la fase», «3 días en la fase». Nada si no se sabe desde cuándo. */
export function textoDeLosDiasEnLaFase(
  faseDesde: string | null,
  ahora: Date = new Date(),
): string | null {
  const dias = diasEnLaFase(faseDesde, ahora)
  if (dias === null) return null
  if (dias === 0) return 'Entró hoy'
  return `${String(dias)} ${dias === 1 ? 'día' : 'días'} en la fase`
}
