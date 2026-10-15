'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Confirmar } from '@/shared/ui/confirmar'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { palabraDePurga } from '../../../entities/papelera'
import type { Objetivo, usePapelera } from '../hooks/use-papelera'

type Props = {
  // Lo que se va a purgar; null = el diálogo está cerrado.
  objetivo: Objetivo | null
  papelera: ReturnType<typeof usePapelera>
  alCerrar: () => void
}

type Textos = { titulo: string; descripcion: string; etiqueta: string; palabra: string | undefined }

const TEXTOS_SIN_OBJETIVO: Textos = {
  titulo: '',
  descripcion: '',
  etiqueta: 'Purgar',
  palabra: undefined,
}

// Cuántos nombres se dicen antes de resumir el resto.
const NOMBRES_A_LA_VISTA = 5

// Qué se purga, dicho con nombres: el diálogo de lo irreversible nombra el objeto.
function textosDe({ lote, leadId }: Objetivo): Textos {
  const uno = leadId ? lote.leads.find((lead) => lead.id === leadId) : null
  const cuales = uno ? [uno] : lote.leads
  const [primero] = cuales
  if (cuales.length === 1 && primero) {
    return {
      titulo: `Purgar «${primero.nombre}»`,
      descripcion:
        'Se borra para siempre, con sus teléfonos, seguimientos y recordatorios. No se puede deshacer ni restaurar.',
      etiqueta: 'Purgar',
      palabra: undefined,
    }
  }
  const nombres = cuales.slice(0, NOMBRES_A_LA_VISTA).map((lead) => `«${lead.nombre}»`)
  const resto = cuales.length - nombres.length
  return {
    titulo: `Purgar el lote de ${String(cuales.length)}`,
    descripcion: `Se borran para siempre, con sus teléfonos, seguimientos y recordatorios: ${nombres.join(', ')}${resto > 0 ? ` y ${String(resto)} más` : ''}. No se puede deshacer ni restaurar.`,
    etiqueta: `Purgar los ${String(cuales.length)}`,
    palabra: palabraDePurga(cuales.length),
  }
}

// Lo que pasó con el intento, dicho dentro del diálogo: sin conexión, o lo que respondió la base.
// Un conflicto ofrece recargar; en ningún caso se purgó nada.
function AvisosDePurga(props: {
  enLinea: boolean
  error: ErrorApp | null
  alRecargar: () => void
}) {
  const { enLinea, error, alRecargar } = props
  const esConflicto = error?.codigo === 'conflicto'
  return (
    <>
      {enLinea ? null : (
        <Aviso tono="aviso">
          No hay conexión. No se purgó nada: vuelve a intentar cuando vuelva.
        </Aviso>
      )}
      {error ? (
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
      ) : null}
    </>
  )
}

// La confirmación de una purga: nombra lo que se borra y, si es un lote de varios, pide tipear.
// No se cierra si el intento no salió: sin conexión lo dice y espera; si otra persona cambió el
// lote, lo dice y ofrece recargar; nada se purgó en ninguno de los dos casos.
export function ConfirmarPurga({ objetivo, papelera, alCerrar }: Props) {
  const router = useRouter()
  const enLinea = useEnLinea()
  const [error, setError] = useState<ErrorApp | null>(null)
  // Mientras se cierra, el diálogo sigue mostrando lo último que tuvo.
  const mostrado = useUltimo(objetivo)
  const textos = mostrado ? textosDe(mostrado) : TEXTOS_SIN_OBJETIVO

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
      alConfirmar={() => {
        void confirmar()
      }}
      titulo={textos.titulo}
      descripcion={textos.descripcion}
      etiquetaConfirmar={textos.etiqueta}
      palabraClave={textos.palabra}
      enCurso={papelera.enCurso}
      deshabilitado={!enLinea || error?.codigo === 'conflicto'}
    >
      <AvisosDePurga
        enLinea={enLinea}
        error={error}
        alRecargar={() => {
          router.refresh()
          cerrar()
        }}
      />
    </Confirmar>
  )
}
