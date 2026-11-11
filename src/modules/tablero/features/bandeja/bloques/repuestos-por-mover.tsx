// Bloque «Repuestos por mover». Hueco: lo llena la Fase 8 (8.13) y sólo edita este archivo (el marco, el esqueleto y el error son de `<Bandeja>`).
import { VacioDeBloque } from '../components/vacio-de-bloque'
import type { CuerpoDeBloque } from './tipos'

export const CuerpoRepuestosPorMover: CuerpoDeBloque = ({ bloque }) => (
  <VacioDeBloque bloque={bloque} />
)
