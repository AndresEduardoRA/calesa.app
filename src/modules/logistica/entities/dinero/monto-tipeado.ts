import { avisoDeNumero, leerNumeroTipeado } from '@/shared/lib/numero-tipeado'

// El monto que escribe la persona en el formulario de un gasto o de un pago (6.11): hasta dos decimales, y no negativo o, en un pago, mayor que cero (D16 y D21 de 6.10-1).
// Devuelve el número o el motivo para escribir junto al campo.
export function leerMontoDeDinero(
  texto: string,
  locale: string,
  { positivo }: { positivo: boolean },
): { monto?: number; error?: string } {
  const leido = leerNumeroTipeado(texto, locale)
  if (!leido.ok) {
    return { error: avisoDeNumero(texto, leido.motivo, locale) }
  }
  if (leido.valor === null) {
    return { error: 'Escribe el monto.' }
  }
  if (positivo && leido.valor <= 0) {
    return { error: 'El monto de un pago es mayor que cero.' }
  }
  if (leido.valor < 0) {
    return { error: 'El monto no puede ser negativo.' }
  }
  if (leido.decimales > 2) {
    return { error: 'El monto lleva como mucho dos decimales.' }
  }
  return { monto: leido.valor }
}
