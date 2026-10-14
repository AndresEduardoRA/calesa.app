import { telefonoParaMostrar } from '../../../entities/telefono'

// El teléfono como lo entrega la vista (completo o enmascarado), legible. Vacío = un guion.
export function telefonoDeLista(telefono: string, codigoDePais: string | null): string {
  return telefono === '' ? '—' : telefonoParaMostrar(telefono, codigoDePais)
}
