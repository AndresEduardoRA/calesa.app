'use client'

import { ArrowLeftIcon, ExternalLinkIcon, XIcon } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { Resultado } from '@/shared/lib/errores'
import { EstadoError } from '@/shared/ui/estados'
import { Skeleton } from '@/shared/ui/skeleton'
import { tituloDe, type PaginaDeConversaciones } from '../../../entities/conversaciones'
import { useListaDeConversaciones } from '../../conversaciones/hooks/use-lista-de-conversaciones'
import { usePrimeraPagina } from '../hooks/use-primera-pagina'
import { HiloDelWidget } from './hilo-del-widget'
import { ListaDelWidget } from './lista-del-widget'

type Props = {
  usuarioId: string
  zona: string
  puedeModerar: boolean
  alCerrar: () => void
}

type PropsDelContenido = Props & { inicial: Resultado<PaginaDeConversaciones> }

const BOTON_DEL_ENCABEZADO =
  'inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-(--radius-md) px-2 text-(length:--text-sm) text-(--color-ink-soft) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) md:h-8 md:min-w-8'

// Lo del panel una vez leída la primera página: la lista o, elegida una conversación, su hilo. Qué conversación está abierta es estado local (el widget no usa
// la URL). La lista queda montada al abrir un hilo: al volver no se relee ni pierde «Ver más».
function ContenidoDelPanel({
  usuarioId,
  zona,
  puedeModerar,
  alCerrar,
  inicial,
}: PropsDelContenido) {
  const lista = useListaDeConversaciones({ usuarioId, inicial })
  const [elegida, setElegida] = useState<string | null>(null)
  const encabezado = useRef<HTMLHeadingElement>(null)
  const conversacion = lista.filas.find((c) => c.id === elegida) ?? null

  // El foco entra al encabezado al abrir el panel y al pasar de la lista al hilo y de vuelta.
  useEffect(() => {
    encabezado.current?.focus()
  }, [elegida])

  return (
    <>
      <header className="flex items-center gap-1 border-b border-(--color-line) px-2 py-2">
        {conversacion ? (
          <button
            type="button"
            aria-label="Volver a la lista"
            onClick={() => {
              setElegida(null)
            }}
            className={BOTON_DEL_ENCABEZADO}
          >
            <ArrowLeftIcon aria-hidden className="size-4" />
          </button>
        ) : null}
        <h2
          ref={encabezado}
          tabIndex={-1}
          className="min-w-0 flex-1 truncate px-1 text-(length:--text-base) font-semibold text-(--color-ink) outline-none"
        >
          {conversacion ? tituloDe(conversacion) : 'Chat'}
        </h2>
        <Link
          href={conversacion ? `/chat?c=${conversacion.id}` : '/chat'}
          onClick={alCerrar}
          aria-label="Abrir en Chat"
          className={BOTON_DEL_ENCABEZADO}
        >
          <ExternalLinkIcon aria-hidden className="size-4" />
        </Link>
        <button
          type="button"
          aria-label="Cerrar el chat"
          onClick={alCerrar}
          className={BOTON_DEL_ENCABEZADO}
        >
          <XIcon aria-hidden className="size-4" />
        </button>
      </header>
      {conversacion ? (
        <HiloDelWidget
          key={conversacion.id}
          conversacion={conversacion}
          usuarioId={usuarioId}
          zona={zona}
          puedeModerar={puedeModerar}
        />
      ) : (
        // También cuando la elegida ya no está en la lista (salió de ella).
        <div className="min-h-0 flex-1 overflow-y-auto py-2">
          <ListaDelWidget
            lista={lista}
            zona={zona}
            alElegir={setElegida}
            alAbrirElChat={alCerrar}
          />
        </div>
      )}
    </>
  )
}

// El panel flotante del chat, no modal: lee la primera página al abrirse (esqueleto, error con «Reintentar») y se cierra con Escape o con su botón. Sólo
// escritorio: en el celular la burbuja es un enlace a `/chat`.
export function PanelDelWidget(props: Props) {
  const { pagina, reintentar } = usePrimeraPagina()
  return (
    <section
      role="dialog"
      aria-label="Chat"
      onKeyDown={(evento) => {
        if (evento.key === 'Escape' && !evento.defaultPrevented) {
          props.alCerrar()
        }
      }}
      className="fixed right-4 bottom-[calc(1rem+44px+0.5rem)] z-40 hidden h-[min(32rem,calc(100dvh-var(--topbar)-6rem))] w-[min(24rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) shadow-(--shadow-md) md:flex"
    >
      {pagina === null ? (
        <div aria-busy="true" className="grid content-start gap-3 p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : pagina.ok ? (
        <ContenidoDelPanel {...props} inicial={pagina} />
      ) : (
        <EstadoError
          compacto
          alReintentar={reintentar}
          titulo="No pudimos cargar tus conversaciones"
          descripcion="Puede ser la conexión o un problema de nuestro lado."
        />
      )}
    </section>
  )
}
