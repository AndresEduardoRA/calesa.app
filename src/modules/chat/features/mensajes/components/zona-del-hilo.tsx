'use client'

import { ArrowLeftIcon, MessagesSquareIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import type { Resultado } from '@/shared/lib/errores'
import { EstadoError, EstadoVacio } from '@/shared/ui/estados'
import { tituloDe, type Conversacion } from '../../../entities/conversaciones'
import { EstadoSinConversacion } from './estado-sin-conversacion'

type Props = {
  // La `?c=` ya validada como GUID, o `null` si no hay selección (o era ilegible).
  idSolicitado: string | null
  // Lo que dijo la lectura de esa conversación: `null` = no es mía.
  lectura: Resultado<Conversacion | null> | null
}

// El lado derecho de `/chat`: el hilo de la conversación abierta. En esta parte sólo dibuja el encabezado; los mensajes
// llegan con la siguiente. El `key` de quien lo usa lo reinicia al cambiar de conversación y el foco pasa al encabezado.
export function ZonaDelHilo({ idSolicitado, lectura }: Props) {
  const router = useRouter()
  const encabezado = useRef<HTMLHeadingElement>(null)
  const hayHilo = lectura?.ok === true && lectura.data !== null
  useEffect(() => {
    if (hayHilo) {
      encabezado.current?.focus()
    }
  }, [hayHilo])

  if (idSolicitado === null || lectura === null) {
    return (
      <EstadoVacio
        Icono={MessagesSquareIcon}
        titulo="Elige una conversación"
        descripcion="Abre una de la lista para ver sus mensajes."
      />
    )
  }
  if (!lectura.ok) {
    return (
      <EstadoError
        alReintentar={() => {
          router.refresh()
        }}
        titulo="No pudimos abrir la conversación"
      />
    )
  }
  if (lectura.data === null) {
    return <EstadoSinConversacion />
  }
  return (
    <section aria-labelledby="titulo-del-hilo" className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b border-(--color-line) px-3 py-3">
        <Link
          href="/chat"
          className="inline-flex h-11 items-center gap-1 rounded-(--radius-md) px-2 text-(length:--text-sm) text-(--color-ink-soft) hover:bg-(--color-surface-3) md:hidden"
        >
          <ArrowLeftIcon aria-hidden className="size-4" />
          Volver a la lista
        </Link>
        <h2
          id="titulo-del-hilo"
          ref={encabezado}
          tabIndex={-1}
          className="truncate text-(length:--text-lg) font-semibold text-(--color-ink) outline-none"
        >
          {tituloDe(lectura.data)}
        </h2>
      </header>
      <p className="p-4 text-(length:--text-sm) text-(--color-ink-soft)">
        Los mensajes llegan con la siguiente parte.
      </p>
    </section>
  )
}
