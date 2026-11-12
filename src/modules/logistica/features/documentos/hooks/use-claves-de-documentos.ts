'use client'

import { puede } from '@/shared/lib/permisos'
import type { ClavesDeDocumentos } from '../../../entities/documentos/revision'
import type { Unidad } from '../../../entities/nucleo/unidad'
import { usePermisosDeDocumentos } from './use-permisos-de-documentos'

// Las claves de aprobar y de subir documentos de quien mira, según la unidad (vehículo: `logistica.documentos.*`; repuesto: `repuestos.documentos.*`) y su origen. `null` mientras los
// permisos no llegan (6.06-3). La base vuelve a exigirlas.
export function useClavesDeDocumentos(
  unidad: Pick<Unidad, 'tipo' | 'origenId'>,
): ClavesDeDocumentos {
  const permisos = usePermisosDeDocumentos()
  const area = unidad.tipo === 'vehiculo' ? 'logistica' : 'repuestos'
  if (permisos === null) return { aprobar: null, subir: null }
  return {
    aprobar: puede(permisos, `${area}.documentos.aprobar`, unidad.origenId),
    subir: puede(permisos, `${area}.documentos.subir`, unidad.origenId),
  }
}
