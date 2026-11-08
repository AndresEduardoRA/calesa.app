'use client'

import type { ReactNode } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { fechaRelativa, formatearFechaHora } from '@/shared/lib/fechas'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import { autorDelComentario, type Comentario } from '../../../entities/comentarios/comentario'
import {
  puedeBorrarComentario,
  puedeEditarComentario,
} from '../../../entities/comentarios/permisos'
import { CampoDeComentario } from './campo-de-comentario'

// Lo que un comentario necesita de la sección: si se modera, los borradores abiertos (editar y responder, por clave) y qué hacer.
export type AccionesDeComentario = {
  puedeModerar: boolean
  borradores: Readonly<Record<string, string>>
  abrir: (clave: string, texto: string) => void
  cambiar: (clave: string, texto: string) => void
  cerrar: (clave: string) => void
  editar: (comentario: Comentario, texto: string) => Promise<ErrorApp | null>
  pedirBorrar: (comentario: Comentario) => void
  recargar: () => void
}

export const claveDeEditar = (id: string) => `editar:${id}`
export const claveDeResponder = (id: string) => `responder:${id}`

const BOTON = 'min-h-11 md:min-h-8'

// Quién y cuándo (la fecha completa al pasar el puntero) y «(editado)».
function CabeceraDelComentario({ comentario }: { comentario: Comentario }) {
  const { zonaHoraria } = useRegional()
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 text-(length:--text-sm)">
      <span className="font-medium [overflow-wrap:anywhere] text-(--color-ink)">
        {autorDelComentario(comentario)}
      </span>
      <time
        dateTime={comentario.creadoEn}
        title={formatearFechaHora(comentario.creadoEn, { zona: zonaHoraria })}
        className="text-(--color-ink-soft)"
      >
        {fechaRelativa(comentario.creadoEn, { zona: zonaHoraria })}
      </time>
      {comentario.editado ? <span className="text-(--color-ink-soft)">(editado)</span> : null}
    </p>
  )
}

// «Responder» (lo trae la raíz), «Editar» y «Borrar», cada uno nombrando de quién es el comentario. Lo que no se puede no se dibuja.
function BotonesDelComentario(props: {
  comentario: Comentario
  acciones: AccionesDeComentario
  responder: ReactNode
}) {
  const { comentario, acciones, responder } = props
  const deQuien = comentario.mio
    ? 'tu comentario'
    : `el comentario de ${autorDelComentario(comentario)}`
  return (
    <div className="flex flex-wrap gap-1">
      {responder}
      {puedeEditarComentario(comentario) ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={BOTON}
          aria-label={`Editar ${deQuien}`}
          onClick={() => {
            acciones.abrir(claveDeEditar(comentario.id), comentario.cuerpo ?? '')
          }}
        >
          Editar
        </Button>
      ) : null}
      {puedeBorrarComentario(comentario, acciones.puedeModerar) ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={BOTON}
          aria-label={`Borrar ${deQuien}`}
          onClick={() => {
            acciones.pedirBorrar(comentario)
          }}
        >
          Borrar
        </Button>
      ) : null}
    </div>
  )
}

// Un comentario (una raíz o una respuesta): la cabecera, el texto con sus saltos de línea o «Comentario eliminado.», y sus botones. «Editar» cambia el texto por un
// campo (el borrador vive en la sección: un «Recargar» no lo pierde); «Borrar» abre el diálogo por la URL.
export function ComentarioDeLaLista(props: {
  comentario: Comentario
  acciones: AccionesDeComentario
  // «Responder» va en la raíz (lo dibuja quien la llama).
  responder?: ReactNode
}) {
  const { comentario, acciones } = props
  const clave = claveDeEditar(comentario.id)
  const borrador = acciones.borradores[clave]
  return (
    <article
      className="grid min-w-0 gap-1"
      aria-label={`Comentario de ${autorDelComentario(comentario)}`}
    >
      <CabeceraDelComentario comentario={comentario} />
      {comentario.eliminado ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft) italic">
          Comentario eliminado.
        </p>
      ) : borrador !== undefined ? (
        <CampoDeComentario
          etiqueta="Edita tu comentario"
          texto={borrador}
          alCambiar={(texto) => {
            acciones.cambiar(clave, texto)
          }}
          etiquetaEnviar="Guardar"
          alEnviar={async (texto) => {
            const rechazo = await acciones.editar(comentario, texto)
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
      ) : (
        <p className="min-w-0 text-(length:--text-sm) break-words whitespace-pre-wrap text-(--color-ink)">
          {comentario.cuerpo}
        </p>
      )}
      {borrador === undefined ? (
        <BotonesDelComentario
          comentario={comentario}
          acciones={acciones}
          responder={props.responder}
        />
      ) : null}
    </article>
  )
}
