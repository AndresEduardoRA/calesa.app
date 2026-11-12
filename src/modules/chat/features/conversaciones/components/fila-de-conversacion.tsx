'use client'

import { BellOffIcon } from 'lucide-react'
import Link from 'next/link'
import { fechaRelativa } from '@/shared/lib/fechas'
import { Avatar } from '@/shared/ui/avatar'
import { cn } from 'cn'
import { textoDeNoLeidos, tituloDe, type Conversacion } from '../../../entities/conversaciones'

type Props = {
  conversacion: Conversacion
  abierta: boolean
  zona: string
  // Con esto la fila es un botón (el panel del widget, que no cambia la URL); sin esto, un enlace a `/chat?c=<id>`.
  alElegir?: (id: string) => void
}

const CLASE_DE_LA_FILA =
  'flex min-h-14 items-center gap-3 rounded-(--radius-md) px-3 py-2 hover:bg-(--color-surface-3) md:min-h-12'

// Lo de adentro de la fila: quién es, cuándo fue lo último y cuántos mensajes sin leer. Una silenciada deja el número visible (en gris) y lo
// dice con el ícono de campana tachada: el color no es el único canal.
function ContenidoDeLaFila({ conversacion, zona }: { conversacion: Conversacion; zona: string }) {
  const titulo = tituloDe(conversacion)
  const noLeidos = textoDeNoLeidos(conversacion.noLeidos)
  return (
    <>
      <Avatar nombre={titulo} lado={36} />
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span
          className={cn(
            'truncate text-(length:--text-base) text-(--color-ink)',
            noLeidos && 'font-semibold',
          )}
        >
          {titulo}
        </span>
        <span className="text-(length:--text-xs) text-(--color-ink-soft)">
          {fechaRelativa(conversacion.ultimoMensajeEn, { zona })}
        </span>
      </span>
      {conversacion.silenciada ? (
        <>
          <BellOffIcon aria-hidden className="size-4 shrink-0 text-(--color-ink-soft)" />
          <span className="sr-only">Silenciada</span>
        </>
      ) : null}
      {noLeidos ? (
        <span
          role="img"
          aria-label={conversacion.noLeidos > 99 ? 'Más de 99 sin leer' : `${noLeidos} sin leer`}
          className={cn(
            'min-w-6 shrink-0 rounded-(--radius-pill) px-1.5 py-0.5 text-center text-(length:--text-xs) font-semibold',
            conversacion.silenciada
              ? 'bg-(--color-paper-dim) text-(--color-ink-soft)'
              : 'bg-(--color-primario) text-(--color-sobre-primario)',
          )}
        >
          {noLeidos}
        </span>
      ) : null}
    </>
  )
}

// Una conversación de la lista: un enlace a `/chat?c=<id>` (o, en el widget, un botón que la elige sin tocar la URL).
export function FilaDeConversacion({ conversacion, abierta, zona, alElegir }: Props) {
  const clase = cn(CLASE_DE_LA_FILA, abierta && 'bg-(--color-surface-3)')
  return (
    <li>
      {alElegir ? (
        <button
          type="button"
          onClick={() => {
            alElegir(conversacion.id)
          }}
          className={cn(clase, 'w-full text-left')}
        >
          <ContenidoDeLaFila conversacion={conversacion} zona={zona} />
        </button>
      ) : (
        <Link
          href={`/chat?c=${conversacion.id}`}
          aria-current={abierta ? 'page' : undefined}
          className={clase}
        >
          <ContenidoDeLaFila conversacion={conversacion} zona={zona} />
        </Link>
      )}
    </li>
  )
}
