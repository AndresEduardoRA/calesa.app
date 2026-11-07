import type { HuecosDelListado } from '../../hoja/components/huecos'
import { EnlaceAPapeleraDeCotizaciones } from './enlace-a-papelera'

// Lo que el área `papelera` llena en el listado `/cotizaciones`: el enlace a la papelera junto a «Nueva cotización» (`Junto`, 4.24-2).
export const HUECOS_DE_PAPELERA_EN_EL_LISTADO: HuecosDelListado = {
  Junto: EnlaceAPapeleraDeCotizaciones,
}
