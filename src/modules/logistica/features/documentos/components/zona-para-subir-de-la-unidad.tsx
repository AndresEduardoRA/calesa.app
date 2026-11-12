'use client'

import { puede } from '@/shared/lib/permisos'
import { ordenarTiposParaElegir } from '../../../entities/documentos/admision'
import { destinoDeLaUnidad } from '../../../entities/documentos/destino'
import type { Unidad } from '../../../entities/nucleo/unidad'
import { usePermisosDeDocumentos } from '../hooks/use-permisos-de-documentos'
import type { DatoDeDocumentos } from '../hooks/use-documentos-de-la-unidad'
import { ZonaParaSubir } from './zona-para-subir'

// La zona de subir de la unidad (6.06-2): los tipos con los que pide una fase primero y el permiso de subir del origen de la unidad, que sale de `mis_permisos` (la base vuelve a exigirlo).
export function ZonaParaSubirDeLaUnidad({
  unidad,
  dato,
}: {
  unidad: Unidad
  dato: DatoDeDocumentos
}) {
  const permisos = usePermisosDeDocumentos()
  const clave =
    unidad.tipo === 'vehiculo' ? 'logistica.documentos.subir' : 'repuestos.documentos.subir'
  const puedeSubir = permisos === null ? null : puede(permisos, clave, unidad.origenId)
  return (
    <ZonaParaSubir
      destino={destinoDeLaUnidad(unidad)}
      titulo="Subir documentos"
      tipos={ordenarTiposParaElegir(dato.tipos, new Set(dato.requisitos.map((r) => r.tipoId)))}
      puedeSubir={puedeSubir}
    />
  )
}
