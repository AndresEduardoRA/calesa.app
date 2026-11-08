'use client'

import { useState } from 'react'
import type { Envio } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import type { Comentario } from '../../../entities/comentarios/comentario'
import type { AccionesDeComentario } from '../components/comentario'
import type { EscrituraDeComentarios } from './use-escritura-de-comentarios'

export const rechazoDe = <T>(envio: Envio<T>): ErrorApp | null => (envio.ok ? null : envio.error)

// Lo que cada comentario de la lista puede hacer (4.27-2). Los borradores de editar y responder viven acá, por clave, aparte de la lista: un «Recargar» la vuelve a
// leer y ellos quedan.
export function useAccionesDeComentario(datos: {
  puedeModerar: boolean
  escritura: EscrituraDeComentarios
  pedirBorrar: (comentario: Comentario) => void
  recargar: () => void
}): AccionesDeComentario {
  const [borradores, setBorradores] = useState<Record<string, string>>({})
  const poner = (clave: string, texto: string) => {
    setBorradores((antes) => ({ ...antes, [clave]: texto }))
  }
  return {
    puedeModerar: datos.puedeModerar,
    borradores,
    abrir: poner,
    cambiar: poner,
    cerrar: (clave) => {
      setBorradores((antes) =>
        Object.fromEntries(Object.entries(antes).filter(([k]) => k !== clave)),
      )
    },
    editar: async (comentario, texto) => rechazoDe(await datos.escritura.editar(comentario, texto)),
    pedirBorrar: datos.pedirBorrar,
    recargar: datos.recargar,
  }
}
