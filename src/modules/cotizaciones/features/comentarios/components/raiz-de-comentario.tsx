'use client'

import type { ErrorApp } from '@/shared/lib/errores'
import { Button } from '@/shared/ui/button'
import { autorDelComentario } from '../../../entities/comentarios/comentario'
import type { RaizCargada } from '../../../entities/comentarios/lista'
import { puedeResponderComentario } from '../../../entities/comentarios/permisos'
import { CampoDeComentario } from './campo-de-comentario'
import { claveDeResponder, ComentarioDeLaLista, type AccionesDeComentario } from './comentario'

type Props = {
  raiz: RaizCargada
  acciones: AccionesDeComentario
  responder: (raizId: string, texto: string) => Promise<ErrorApp | null>
  // «Ver más respuestas»: si se ofrece, si está pidiendo, si falló y qué hacer.
  ofreceMas: boolean
  pidiendo: boolean
  falloDeRespuestas: ErrorApp | null
  ocupado: boolean
  verMasRespuestas: () => void
}

// «Ver más respuestas» al pie de las respuestas, o su fallo con «Reintentar».
function MasRespuestas(
  props: Pick<
    Props,
    'ofreceMas' | 'pidiendo' | 'falloDeRespuestas' | 'ocupado' | 'verMasRespuestas'
  >,
) {
  const { ofreceMas, pidiendo, falloDeRespuestas, ocupado, verMasRespuestas } = props
  if (falloDeRespuestas) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2">
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {falloDeRespuestas.mensaje}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 md:min-h-7"
          disabled={ocupado}
          onClick={verMasRespuestas}
        >
          Reintentar
        </Button>
      </div>
    )
  }
  return ofreceMas ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-11 w-fit md:min-h-7"
      disabled={ocupado}
      onClick={verMasRespuestas}
    >
      {pidiendo ? 'Cargando…' : 'Ver más respuestas'}
    </Button>
  ) : null
}

// Una raíz con sus respuestas (un nivel): «Ver más respuestas» al pie de ellas y, con «Responder», el campo de la respuesta debajo.
export function RaizDeComentario(props: Props) {
  const { raiz, acciones, responder } = props
  const clave = claveDeResponder(raiz.id)
  const borrador = acciones.borradores[clave]
  const autor = autorDelComentario(raiz)
  const botonResponder =
    puedeResponderComentario(true) && borrador === undefined ? (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="min-h-11 md:min-h-8"
        aria-label={raiz.mio ? 'Responder tu comentario' : `Responder el comentario de ${autor}`}
        onClick={() => {
          acciones.abrir(clave, '')
        }}
      >
        Responder
      </Button>
    ) : null
  const conHilo = raiz.respuestas.length > 0 || props.ofreceMas || borrador !== undefined
  return (
    <li className="grid min-w-0 gap-2 rounded-(--radius-md) border border-(--color-border) p-3">
      <ComentarioDeLaLista comentario={raiz} acciones={acciones} responder={botonResponder} />
      {conHilo ? (
        <div className="grid min-w-0 gap-2 border-l-2 border-(--color-border) pl-3">
          {raiz.respuestas.length > 0 ? (
            <ul className="grid min-w-0 gap-3" aria-label={`Respuestas a ${autor}`}>
              {raiz.respuestas.map((respuesta) => (
                <li key={respuesta.id} className="min-w-0">
                  <ComentarioDeLaLista comentario={respuesta} acciones={acciones} />
                </li>
              ))}
            </ul>
          ) : null}
          <MasRespuestas {...props} />
          {borrador !== undefined ? (
            <CampoDeComentario
              etiqueta="Escribe una respuesta"
              texto={borrador}
              alCambiar={(texto) => {
                acciones.cambiar(clave, texto)
              }}
              etiquetaEnviar="Responder"
              alEnviar={async (texto) => {
                const rechazo = await responder(raiz.id, texto)
                if (rechazo === null) {
                  acciones.cerrar(clave)
                }
                return rechazo
              }}
              alCancelar={() => {
                acciones.cerrar(clave)
              }}
              alRecargar={acciones.recargar}
              autoFoco
            />
          ) : null}
        </div>
      ) : null}
    </li>
  )
}
