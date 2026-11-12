'use client'

import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { Skeleton } from '@/shared/ui/skeleton'
import { textoDelTope } from '@/shared/lib/conteo'
import { TOPE_DE_DOCUMENTOS_DE_LA_UNIDAD } from '../../../areas/documentos/composicion.client'
import { agruparPorTipo } from '../../../entities/documentos/agrupar'
import type { Unidad } from '../../../entities/nucleo/unidad'
import { useDocumentosDeLaUnidad } from '../hooks/use-documentos-de-la-unidad'
import { GrupoDeTipoDeDocumento } from './grupo-de-tipo'

function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando los documentos" className="grid gap-2">
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
    </div>
  )
}

// El hueco «Documentos» del panel de la unidad y la pestaña «Documentos» de la ficha: un solo componente (D2). Hoy lee y muestra (6.06-1); subir, aprobar y rechazar llegan en 6.06-2 y
// 6.06-3. Se dibuja con `logistica.ver` del origen; la base decide lo demás.
export function HuecoDeDocumentos({ unidad }: { unidad: Unidad }) {
  const { lectura, reintentar } = useDocumentosDeLaUnidad(unidad)
  const dato = lectura.tipo === 'listo' ? lectura.dato : null
  const grupos = dato ? agruparPorTipo(dato.documentos, dato.tipos, dato.requisitos, dato.hoy) : []
  return (
    <div className="grid gap-3" data-hueco="documentos">
      {lectura.tipo === 'cargando' ? <Cargando /> : null}
      {lectura.tipo === 'error' ? (
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
      ) : null}
      {dato && grupos.length === 0 ? (
        <EstadoVacio compacto titulo="Esta unidad no tiene documentos." />
      ) : null}
      {dato && grupos.length > 0 ? (
        <>
          {grupos.map((grupo) => (
            <GrupoDeTipoDeDocumento
              key={grupo.tipo?.id ?? 'otro-tipo'}
              grupo={grupo}
              nombres={dato.nombres}
              hoy={dato.hoy}
            />
          ))}
          {dato.hayMas ? (
            <AvisoDeTope
              texto={textoDelTope(TOPE_DE_DOCUMENTOS_DE_LA_UNIDAD, { sustantivo: 'documentos' })}
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}
