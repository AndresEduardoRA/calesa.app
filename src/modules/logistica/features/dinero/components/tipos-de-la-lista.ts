import type { Pagina } from '@/shared/lib/paginacion'
import type { FilaDeGasto, FilaDePago } from '../../../entities/dinero/listas'

// Lo que dibuja la lista: la vista y su página (cada una con sus filas).
export type ListaDeDinero =
  { vista: 'gastos'; pagina: Pagina<FilaDeGasto> } | { vista: 'pagos'; pagina: Pagina<FilaDePago> }
