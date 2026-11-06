import type { HuecosDeLaHoja } from '../../hoja/components/huecos'
import { EnlaceDeLaFormulaSinPublicar } from './enlace-de-la-formula-sin-publicar'

// Lo que el área `formula` llena en la hoja: el enlace de «Falta publicar la fórmula». El ⚙ de una celda y «Aplicar también a esta cotización» (`Proveedor`) los suma el 4.20.
export const HUECOS_DE_FORMULA_EN_LA_HOJA: HuecosDeLaHoja = {
  EnlaceSinPublicar: EnlaceDeLaFormulaSinPublicar,
}
