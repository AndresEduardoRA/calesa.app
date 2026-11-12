'use client'

import { ExternalLinkIcon, MessagesSquareIcon } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import type { useListaDeConversaciones } from '../../conversaciones/hooks/use-lista-de-conversaciones'
import { ErrorDeLaLista } from '../../conversaciones/components/error-de-la-lista'
import { FilaDeConversacion } from '../../conversaciones/components/fila-de-conversacion'
import { PieDeLaLista } from '../../conversaciones/components/pie-de-la-lista'

type Props = {
  lista: ReturnType<typeof useListaDeConversaciones>
  zona: string
  alElegir: (id: string) => void
  alAbrirElChat: () => void
}

// La lista del panel: las mismas filas de `/chat`, que aquí eligen la conversación sin cambiar la URL. Sin conversaciones, lleva a `/chat` (donde se crean).
export function ListaDelWidget({ lista, zona, alElegir, alAbrirElChat }: Props) {
  if (lista.errorDeLista && lista.filas.length === 0) {
    return <ErrorDeLaLista alReintentar={() => void lista.recargar()} />
  }
  if (lista.filas.length === 0) {
    return (
      <EstadoVacio
        compacto
        Icono={MessagesSquareIcon}
        titulo="Aún no tienes conversaciones"
        descripcion="Empieza una desde el chat."
        accion={
          <Link
            href="/chat"
            onClick={alAbrirElChat}
            className={buttonVariants({ variant: 'outline' })}
          >
            Abrir el chat
          </Link>
        }
      />
    )
  }
  return (
    <>
      <ul className="grid gap-0.5 px-1">
        {lista.filas.map((c) => (
          <FilaDeConversacion
            key={c.id}
            conversacion={c}
            abierta={false}
            zona={zona}
            alElegir={alElegir}
          />
        ))}
      </ul>
      <PieDeLaLista
        filas={lista.filas.length}
        hayMas={lista.hayMas}
        enElTope={lista.enElTope}
        cargandoMas={lista.cargandoMas}
        error={lista.errorAlCargarMas}
        cargarMas={() => void lista.cargarMas()}
      />
      <Link
        href="/chat"
        onClick={alAbrirElChat}
        className="mx-1 mt-1 mb-2 flex min-h-11 items-center gap-2 rounded-(--radius-md) px-3 text-(length:--text-sm) text-(--color-ink-soft) hover:bg-(--color-surface-3) md:min-h-9"
      >
        <ExternalLinkIcon aria-hidden className="size-4" />
        Abrir el chat
      </Link>
    </>
  )
}
