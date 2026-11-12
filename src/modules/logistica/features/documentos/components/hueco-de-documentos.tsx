'use client'

import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { Skeleton } from '@/shared/ui/skeleton'
import { textoDelTope } from '@/shared/lib/conteo'
import { TOPE_DE_DOCUMENTOS_DE_LA_UNIDAD } from '../../../areas/documentos/composicion.client'
import { agruparPorTipo, type GrupoDeTipo } from '../../../entities/documentos/agrupar'
import type { Unidad } from '../../../entities/nucleo/unidad'
import {
  useDocumentosDeLaUnidad,
  type DatoDeDocumentos,
  type LecturaDeDocumentos,
} from '../hooks/use-documentos-de-la-unidad'
import { useEliminarDocumentoPorUrl } from '../hooks/use-eliminar-documento-por-url'
import { useEliminarElDocumento } from '../hooks/use-eliminar-el-documento'
import { useClavesDeDocumentos } from '../hooks/use-claves-de-documentos'
import type { ContextoDeLaFila } from './contexto-de-la-fila'
import { ConfirmarEliminarDocumento } from './confirmar-eliminar-documento'
import { GrupoDeTipoDeDocumento } from './grupo-de-tipo'
import { ZonaParaSubirDeLaUnidad } from './zona-para-subir-de-la-unidad'

function ErrorDeLectura({ mensaje, reintentar }: { mensaje: string; reintentar: () => void }) {
  return (
    <div className="grid gap-2">
      <Aviso tono="peligro">
        <p>{mensaje}</p>
      </Aviso>
      <div>
        <Button variant="outline" className="min-h-11 md:min-h-9" onClick={reintentar}>
          Reintentar
        </Button>
      </div>
    </div>
  )
}

function EstadoDeLaLectura({
  lectura,
  reintentar,
}: {
  lectura: LecturaDeDocumentos
  reintentar: () => void
}) {
  if (lectura.tipo === 'cargando') return <Cargando />
  if (lectura.tipo === 'error') {
    return <ErrorDeLectura mensaje={lectura.error.mensaje} reintentar={reintentar} />
  }
  return null
}

function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando los documentos" className="grid gap-2">
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
    </div>
  )
}

function ListaDeGrupos({
  dato,
  grupos,
  contexto,
}: {
  dato: DatoDeDocumentos
  grupos: GrupoDeTipo[]
  contexto: ContextoDeLaFila
}) {
  return (
    <>
      {grupos.map((grupo) => (
        <GrupoDeTipoDeDocumento
          key={grupo.tipo?.id ?? 'otro-tipo'}
          grupo={grupo}
          contexto={contexto}
          nombres={dato.nombres}
          hoy={dato.hoy}
        />
      ))}
      {dato.hayMas && grupos.length > 0 ? (
        <AvisoDeTope
          texto={textoDelTope(TOPE_DE_DOCUMENTOS_DE_LA_UNIDAD, { sustantivo: 'documentos' })}
        />
      ) : null}
    </>
  )
}

// El hueco «Documentos» del panel de la unidad y la pestaña «Documentos» de la ficha: un solo componente (D2). Lee y muestra (6.06-1), sube con una bandeja (6.06-2) y revisa cada fila
// (6.06-3). Se dibuja con `logistica.ver` del origen; la base decide lo demás.
export function HuecoDeDocumentos({ unidad }: { unidad: Unidad }) {
  const { lectura, reintentar, releer } = useDocumentosDeLaUnidad(unidad)
  const claves = useClavesDeDocumentos(unidad)
  const dato = lectura.tipo === 'listo' ? lectura.dato : null
  const grupos = dato ? agruparPorTipo(dato.documentos, dato.tipos, dato.requisitos, dato.hoy) : []
  const eliminando = useEliminarDocumentoPorUrl(dato?.documentos ?? null, claves)
  const eliminar = useEliminarElDocumento(unidad.id)
  const contexto: ContextoDeLaFila = {
    unidadId: unidad.id,
    claves,
    tipos: dato?.tipos ?? [],
    releer,
    alEliminar: eliminando.abrir,
  }
  return (
    <div className="grid gap-3" data-hueco="documentos">
      <EstadoDeLaLectura lectura={lectura} reintentar={reintentar} />
      {dato ? <ZonaParaSubirDeLaUnidad unidad={unidad} dato={dato} /> : null}
      {dato && grupos.length === 0 ? (
        <EstadoVacio compacto titulo="Esta unidad no tiene documentos." />
      ) : null}
      {dato ? <ListaDeGrupos dato={dato} grupos={grupos} contexto={contexto} /> : null}
      <ConfirmarEliminarDocumento
        documento={eliminando.documento}
        abierto={eliminando.abierto}
        eliminar={eliminar}
        alCerrar={eliminando.cerrar}
      />
    </div>
  )
}
