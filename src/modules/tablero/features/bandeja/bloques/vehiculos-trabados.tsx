// Bloque «Vehículos trabados». Hueco: lo llena la Fase 6 y sólo edita este archivo (el marco, el esqueleto y el error son de `<Bandeja>`).
import { VacioDeBloque } from '../components/vacio-de-bloque'
import type { CuerpoDeBloque } from './tipos'

export const CuerpoVehiculosTrabados: CuerpoDeBloque = ({ bloque }) => (
  <VacioDeBloque bloque={bloque} />
)
