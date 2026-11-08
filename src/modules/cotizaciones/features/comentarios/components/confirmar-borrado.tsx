'use client'

import { useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Confirmar } from '@/shared/ui/confirmar'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { tieneRespuestas, textosDelBorrado } from '../../../entities/comentarios/borrado'
import type { Comentario } from '../../../entities/comentarios/comentario'
import type { RaizCargada } from '../../../entities/comentarios/lista'

type Props = {
  // Lo que se va a borrar; null = cerrado. Estable entre renders (sale de la lista).
  objetivo: Comentario | null
  // La raíz cargada si lo que se borra es una raíz (para decir si sus respuestas quedan).
  comoRaiz: RaizCargada | null
  borrar: (comentario: Comentario) => Promise<ErrorApp | null>
  alCerrar: () => void
  alRecargar: () => void
}

// La confirmación de borrar un comentario (4.27-2), con su URL (`?panel=borrar-comentario&comentario=<id>`). Nombra de quién es y cita el comienzo; en una raíz con
// respuestas dice que ellas quedan. Si la base lo rechaza, lo dice adentro y no se cierra; un conflicto apaga «Borrar» y ofrece «Recargar».
export function ConfirmarBorradoDeComentario({
  objetivo,
  comoRaiz,
  borrar,
  alCerrar,
  alRecargar,
}: Props) {
  const [error, setError] = useState<ErrorApp | null>(null)
  const [enCurso, setEnCurso] = useState(false)
  // Mientras se cierra, el diálogo sigue mostrando lo último que tuvo.
  const mostrado = useUltimo(objetivo)
  const textos = mostrado
    ? textosDelBorrado(mostrado, comoRaiz !== null && tieneRespuestas(comoRaiz))
    : { titulo: '', descripcion: '' }

  function cerrar() {
    setError(null)
    alCerrar()
  }

  async function confirmar() {
    if (!objetivo) {
      return
    }
    setError(null)
    setEnCurso(true)
    const rechazo = await borrar(objetivo)
    setEnCurso(false)
    if (rechazo === null) {
      cerrar()
    } else {
      setError(rechazo)
    }
  }

  const esConflicto = error?.codigo === 'conflicto'
  return (
    <Confirmar
      abierto={objetivo !== null}
      alCerrar={cerrar}
      alConfirmar={confirmar}
      titulo={textos.titulo}
      descripcion={textos.descripcion}
      etiquetaConfirmar="Borrar"
      enCurso={enCurso}
      deshabilitado={esConflicto}
    >
      {error ? (
        <Aviso tono={esConflicto ? 'aviso' : 'peligro'}>
          <p>{error.mensaje}</p>
          {esConflicto ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 min-h-11 md:min-h-7"
              onClick={() => {
                cerrar()
                alRecargar()
              }}
            >
              Recargar
            </Button>
          ) : null}
        </Aviso>
      ) : null}
    </Confirmar>
  )
}
