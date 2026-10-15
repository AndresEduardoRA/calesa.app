import 'server-only'
import { ok, type Resultado } from '@/shared/lib/errores'
import {
  leerRecordatoriosDelLead,
  leerSeguimientos,
  leerTiposDeSeguimiento,
} from '../../composicion'
import type { TipoDeSeguimiento } from '../../entities/alta'
import type { Recordatorio } from '../../entities/recordatorios'
import type { PaginaDeSeguimientos } from '../../entities/seguimiento'

export type DatosDeSeguimientos = {
  pagina: PaginaDeSeguimientos
  // Los activos: lo que ofrece el redactor.
  tipos: TipoDeSeguimiento[]
  // Los de quien mira sobre este lead (son personales).
  recordatorios: Recordatorio[]
}

// La sección «Seguimientos»: la primera página que quien mira ve (la RLS decide), los tipos activos y
// sus recordatorios sobre el lead, en paralelo. Sólo se lee con la sección abierta: la ficha no paga esto en «Datos».
export async function leerSeguimientosDeLead(
  leadId: string,
): Promise<Resultado<DatosDeSeguimientos>> {
  const [pagina, tipos, recordatorios] = await Promise.all([
    leerSeguimientos({ leadId, antes: null }),
    leerTiposDeSeguimiento(),
    leerRecordatoriosDelLead(leadId),
  ])
  if (!pagina.ok) {
    return pagina
  }
  if (!tipos.ok) {
    return tipos
  }
  if (!recordatorios.ok) {
    return recordatorios
  }
  return ok({ pagina: pagina.data, tipos: tipos.data, recordatorios: recordatorios.data })
}
