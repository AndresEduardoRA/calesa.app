'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { Skeleton } from '@/shared/ui/skeleton'
import { puede } from '@/shared/lib/permisos'
import { ordenarTiposParaElegir } from '../../../entities/documentos/admision'
import { destinoDelGrupo } from '../../../entities/documentos/destino'
import type { GrupoDeLogistica } from '../../../entities/nucleo/grupo'
import { useUnidadesDelGrupo, type DatoDelGrupo } from '../hooks/use-unidades-del-grupo'
import { usePermisosDeDocumentos } from '../hooks/use-permisos-de-documentos'
import { ZonaParaSubir } from './zona-para-subir'

export const MAS_DE_100_UNIDADES = 'Este grupo tiene más de 100 unidades: súbelo por partes.'
export const GRUPO_SIN_UNIDADES = 'Este grupo no tiene unidades.'

function titulo(n: number): string {
  return n === 1 ? 'Subir un documento a la unidad' : `Subir un documento a las ${n} unidades`
}

function ZonaDelGrupo({ dato }: { dato: DatoDelGrupo }) {
  const permisos = usePermisosDeDocumentos()
  const primera = dato.unidades[0]
  const destino = dato.hayMas ? null : destinoDelGrupo(dato.unidades.map((u) => u.id))
  if (dato.hayMas) {
    return <Aviso tono="aviso">{MAS_DE_100_UNIDADES}</Aviso>
  }
  if (!primera || !destino) {
    return <EstadoVacio compacto titulo={GRUPO_SIN_UNIDADES} />
  }
  // La base exige la clave en cada unidad; el botón se decide con la del origen de la primera.
  const puedeSubir =
    permisos === null ? null : puede(permisos, 'logistica.documentos.subir', primera.origenId)
  return (
    <ZonaParaSubir
      destino={destino}
      titulo={titulo(destino.vehiculos.length)}
      tipos={ordenarTiposParaElegir(dato.tipos, new Set())}
      puedeSubir={puedeSubir}
    />
  )
}

// El hueco del resumen de un grupo (embarque, contenedor o declaración) para subir un documento a todas sus unidades (6.06-3): cada archivo se sube una vez y se registra para cada
// unidad. No hay lista de documentos aquí: se ven en el panel de cada unidad.
export function HuecoDeDocumentosDelGrupo({ grupo }: { grupo: GrupoDeLogistica }) {
  const { lectura, reintentar } = useUnidadesDelGrupo(grupo)
  if (lectura.tipo === 'cargando') {
    return (
      <div aria-busy="true" aria-label="Cargando las unidades" className="grid gap-2">
        <Skeleton className="h-16" />
      </div>
    )
  }
  if (lectura.tipo === 'error') {
    return (
      <div className="grid gap-2">
        <Aviso tono="peligro">
          <p>{lectura.error.mensaje}</p>
        </Aviso>
        <div>
          <Button variant="outline" className="min-h-11 md:min-h-9" onClick={reintentar}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }
  return (
    <div className="grid gap-3" data-hueco="documentos-del-grupo">
      <ZonaDelGrupo dato={lectura.dato} />
    </div>
  )
}
