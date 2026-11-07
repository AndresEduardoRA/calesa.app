'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Confirmar } from '@/shared/ui/confirmar'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { textosDeLaPurga, type TextosDeLaPurga } from '../../../entities/papelera/purga'
import type { Objetivo, usePapelera } from '../hooks/use-papelera'

type Props = {
  // Lo que se va a purgar; null = el diálogo está cerrado.
  objetivo: Objetivo | null
  papelera: ReturnType<typeof usePapelera>
  alCerrar: () => void
}

const SIN_OBJETIVO: TextosDeLaPurga = {
  titulo: '',
  descripcion: '',
  etiqueta: 'Purgar',
  palabra: undefined,
}

// Lo que respondió la base, dicho dentro del diálogo (sin conexión lo dice `Confirmar`). Un conflicto ofrece recargar; en ningún caso se purgó nada.
function AvisosDePurga(props: { error: ErrorApp | null; alRecargar: () => void }) {
  const { error, alRecargar } = props
  if (!error) {
    return null
  }
  const esConflicto = error.codigo === 'conflicto'
  return (
    <Aviso tono={esConflicto ? 'aviso' : 'peligro'}>
      <p>{error.mensaje}</p>
      {esConflicto ? (
        <>
          <p>No se purgó nada. Recarga para ver cómo quedó el lote.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 min-h-11 md:min-h-7"
            onClick={alRecargar}
          >
            Recargar
          </Button>
        </>
      ) : null}
    </Aviso>
  )
}

// La confirmación de una purga (4.24-2b): nombra lo que se borra y, si es un lote de varios, pide tipear «purgar N». Se monta una vez en la pantalla. No se
// cierra si el intento no salió: sin conexión lo dice y espera; si otra persona cambió el lote, lo dice, apaga el botón y ofrece recargar.
export function ConfirmarPurga({ objetivo, papelera, alCerrar }: Props) {
  const router = useRouter()
  const [error, setError] = useState<ErrorApp | null>(null)
  // Mientras se cierra, el diálogo sigue mostrando lo último que tuvo.
  const mostrado = useUltimo(objetivo)
  const textos = mostrado ? textosDeLaPurga(mostrado) : SIN_OBJETIVO

  function cerrar() {
    setError(null)
    alCerrar()
  }

  async function confirmar() {
    if (!objetivo) {
      return
    }
    setError(null)
    const resultado = await papelera.purgar(objetivo)
    if (resultado.ok) {
      cerrar()
    } else {
      setError(resultado.error)
    }
  }

  return (
    <Confirmar
      abierto={objetivo !== null}
      alCerrar={cerrar}
      alConfirmar={confirmar}
      titulo={textos.titulo}
      descripcion={textos.descripcion}
      etiquetaConfirmar={textos.etiqueta}
      palabraClave={textos.palabra}
      enCurso={papelera.enCurso}
      deshabilitado={error?.codigo === 'conflicto'}
    >
      <AvisosDePurga
        error={error}
        alRecargar={() => {
          router.refresh()
          cerrar()
        }}
      />
    </Confirmar>
  )
}
