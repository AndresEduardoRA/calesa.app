import type { HuecosDeLaHoja } from '../../hoja/components/huecos'
import { EnlaceDeLaFormulaSinPublicar } from './enlace-de-la-formula-sin-publicar'
import { ProveedorDelAjuste } from './hoja/proveedor-del-ajuste'

// Lo que el área `formula` llena en la hoja: el enlace de «Falta publicar la fórmula» y el ⚙ de una celda con «Aplicar también a esta cotización» (`Proveedor`, 4.20-3b:
// el de una constante; el de un tipo de cambio dice dónde se cambia hasta el 4.20-3c).
export const HUECOS_DE_FORMULA_EN_LA_HOJA: HuecosDeLaHoja = {
  EnlaceSinPublicar: EnlaceDeLaFormulaSinPublicar,
  Proveedor: ProveedorDelAjuste,
}
