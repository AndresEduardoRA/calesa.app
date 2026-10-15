import 'server-only'
import { ok, type Resultado } from '@/shared/lib/errores'
import { leerSeguimientos, leerTiposDeSeguimiento } from '../../composicion'
import type { TipoDeSeguimiento } from '../../entities/alta'
import type { PaginaDeSeguimientos } from '../../entities/seguimiento'

export type DatosDeSeguimientos = {
  pagina: PaginaDeSeguimientos
  // Los activos: lo que ofrece el redactor.
  tipos: TipoDeSeguimiento[]
}

// La sección «Seguimientos»: la primera página que quien mira ve (la RLS decide) y los tipos activos,
// en paralelo. Sólo se lee con la sección abierta: la ficha no paga esto en «Datos».
export async function leerSeguimientosDeLead(
  leadId: string,
): Promise<Resultado<DatosDeSeguimientos>> {
  const [pagina, tipos] = await Promise.all([
    leerSeguimientos({ leadId, antes: null }),
    leerTiposDeSeguimiento(),
  ])
  if (!pagina.ok) {
    return pagina
  }
  if (!tipos.ok) {
    return tipos
  }
  return ok({ pagina: pagina.data, tipos: tipos.data })
}
