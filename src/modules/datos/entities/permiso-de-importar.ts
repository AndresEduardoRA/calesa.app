// Quién puede crear una importación total (9.06-4): el espejo de `importacion_crear`, dicho antes de llamarla (D39). La base lo vuelve a
// exigir (y además que el destino esté activo y pueda recibir leads, y que el origen esté activo): esto sólo ahorra el viaje y dibuja.
import { puede, type Permisos } from '@/shared/lib/permisos'
import type { EntidadImportable } from './plantillas'

export type DestinoDeImportacion = {
  entidad: EntidadImportable
  asignarA: string | null
  origenId: string | null
}

export function motivoParaNoImportar(
  permisos: Permisos,
  yo: string,
  { entidad, asignarA, origenId }: DestinoDeImportacion,
): string | null {
  if (entidad === 'vehiculos') {
    return origenId !== null && puede(permisos, 'vehiculos.crear', origenId)
      ? null
      : 'No tienes permiso para crear vehículos en ese origen.'
  }
  if (asignarA !== null && asignarA !== yo) {
    return puede(permisos, 'datos.importar.todo')
      ? null
      : 'No tienes permiso para importar leads para otra persona.'
  }
  return puede(permisos, 'leads.crear') ? null : 'No tienes permiso para crear leads.'
}
