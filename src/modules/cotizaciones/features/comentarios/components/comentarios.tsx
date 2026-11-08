'use client'

import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import { rechazoDe, useAccionesDeComentario } from '../hooks/use-acciones-de-comentario'
import { useBorradoPorUrl } from '../hooks/use-borrado-por-url'
import { useComentarios, type Comentarios as EstadoDeComentarios } from '../hooks/use-comentarios'
import {
  useEscrituraDeComentarios,
  type EscrituraDeComentarios,
} from '../hooks/use-escritura-de-comentarios'
import { Adjuntos } from './adjuntos'
import { CampoDeComentario } from './campo-de-comentario'
import type { AccionesDeComentario } from './comentario'
import { ConfirmarBorradoDeComentario } from './confirmar-borrado'
import { EsqueletoDeComentarios } from './esqueleto-de-comentarios'
import { DesdeUnaFecha, PieDeComentarios } from './pie-de-comentarios'
import { RaizDeComentario } from './raiz-de-comentario'

type PropsDeLaLista = {
  comentarios: EstadoDeComentarios
  escritura: EscrituraDeComentarios
  acciones: AccionesDeComentario
}

// La lista, o lo que se ve en su lugar: el error de la lectura con «Reintentar», el esqueleto mientras llega la primera página o el vacío.
function ListaDeComentarios({ comentarios, escritura, acciones }: PropsDeLaLista) {
  const { lista, errorDeLectura } = comentarios
  if (errorDeLectura) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2">
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{errorDeLectura.mensaje}</p>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          onClick={comentarios.reintentar}
        >
          Reintentar
        </Button>
      </div>
    )
  }
  if (!comentarios.cargada) {
    return <EsqueletoDeComentarios />
  }
  if (lista.raices.length === 0) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        {comentarios.desde === null
          ? 'Todavía no hay comentarios.'
          : 'No hay comentarios hasta ese día.'}
      </p>
    )
  }
  return (
    <ul className="grid min-w-0 gap-3" aria-busy={comentarios.leyendo}>
      {lista.raices.map((raiz) => (
        <RaizDeComentario
          key={raiz.id}
          raiz={raiz}
          acciones={acciones}
          responder={async (raizId, texto) => rechazoDe(await escritura.comentar(texto, raizId))}
          ofreceMas={raiz.hayMasRespuestas && !comentarios.enElTope}
          pidiendo={comentarios.pidiendo === raiz.id}
          falloDeRespuestas={comentarios.fallo?.donde === raiz.id ? comentarios.fallo.error : null}
          ocupado={comentarios.ocupado}
          verMasRespuestas={() => {
            comentarios.verMasRespuestas(raiz.id)
          }}
        />
      ))}
    </ul>
  )
}

// Los comentarios de una cotización guardada (4.27-2): los adjuntos (4.27-3), el campo «Escribe un comentario» arriba (lo más nuevo va primero), la lista por cursor
// con sus respuestas, el pie y el diálogo de borrar. Se monta cuando la sección llega a la pantalla (`diferido()`). `puedeAdjuntar` es `puedeGuardar` de la
// guardada; quién modera lo dice la lectura de comentarios (mientras no llega, «Quitar» lo ajeno no se dibuja).
export function Comentarios({
  cotizacionId,
  puedeAdjuntar,
}: {
  cotizacionId: string
  puedeAdjuntar: boolean
}) {
  const { zonaHoraria } = useRegional()
  const comentarios = useComentarios(cotizacionId, zonaHoraria)
  const escritura = useEscrituraDeComentarios(cotizacionId, comentarios.aplicar)
  const borrado = useBorradoPorUrl(comentarios.lista, comentarios.cargada, comentarios.puedeModerar)
  const acciones = useAccionesDeComentario({
    puedeModerar: comentarios.puedeModerar,
    escritura,
    pedirBorrar: (comentario) => {
      borrado.abrir(comentario.id)
    },
    recargar: comentarios.recargar,
  })
  const [nuevo, setNuevo] = useState('')

  if (comentarios.errorDeLectura?.codigo === 'sin_permiso') {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        No tienes acceso a esta cotización.
      </p>
    )
  }
  return (
    <div className="grid min-w-0 gap-4">
      <Adjuntos
        cotizacionId={cotizacionId}
        quien={{ puedeAdjuntar, puedeModerar: comentarios.puedeModerar }}
      />
      <CampoDeComentario
        etiqueta="Escribe un comentario"
        texto={nuevo}
        alCambiar={setNuevo}
        etiquetaEnviar="Comentar"
        alEnviar={async (texto) => {
          const envio = await escritura.comentar(texto, null)
          if (envio.ok) {
            setNuevo('')
          }
          return rechazoDe(envio)
        }}
        alRecargar={comentarios.recargar}
        deshabilitado={!comentarios.cargada}
      />
      <DesdeUnaFecha comentarios={comentarios} zona={zonaHoraria} />
      <ListaDeComentarios comentarios={comentarios} escritura={escritura} acciones={acciones} />
      {comentarios.cargada && !comentarios.errorDeLectura ? (
        <PieDeComentarios comentarios={comentarios} zona={zonaHoraria} />
      ) : null}
      <ConfirmarBorradoDeComentario
        objetivo={borrado.comentario}
        comoRaiz={borrado.comoRaiz}
        borrar={async (comentario) => rechazoDe(await escritura.borrar(comentario))}
        alCerrar={borrado.cerrar}
        alRecargar={comentarios.recargar}
      />
    </div>
  )
}
