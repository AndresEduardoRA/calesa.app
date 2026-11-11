// Bloque «Leads sin seguimiento». Hueco: lo llena este paso (9.02) y sólo edita este archivo (el marco, el esqueleto y el error son de `<Bandeja>`).
import { VacioDeBloque } from '../components/vacio-de-bloque'
import type { CuerpoDeBloque } from './tipos'

export const CuerpoLeadsSinSeguimiento: CuerpoDeBloque = ({ bloque }) => (
  <VacioDeBloque bloque={bloque} />
)
