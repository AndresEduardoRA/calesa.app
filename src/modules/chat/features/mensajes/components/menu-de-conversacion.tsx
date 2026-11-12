'use client'

import { BellIcon, BellOffIcon, LogOutIcon, MoreHorizontalIcon } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { tituloDe, type Conversacion } from '../../../entities/conversaciones'
import { puedeSalirDe } from '../../../entities/escritura'
import { silenciarConversacion } from '../../conversaciones/actions/silenciar-conversacion'
import { useAbrirSalir } from '../../conversaciones/hooks/use-salir-por-url'
import { MENSAJE_DE_VALIDACION } from '../../resultado'

const RENGLON = 'min-h-11 md:min-h-8'

// El «⋯» del encabezado del hilo: silenciar (o dejar de silenciar) y, en un grupo o en el canal del equipo, salir. Una directa no se deja:
// se silencia.
export function MenuDeConversacion({ conversacion }: { conversacion: Conversacion }) {
  const silenciar = useAction(silenciarConversacion)
  const salir = useAbrirSalir()
  const silenciada = conversacion.silenciada

  async function alternarSilencio() {
    const envio = await enviarAccion(
      silenciar.executeAsync({ conversacion: conversacion.id, silenciada: !silenciada }),
      MENSAJE_DE_VALIDACION,
    )
    if (envio.ok) {
      avisarExito(silenciada ? 'Dejaste de silenciarla.' : 'Conversación silenciada.')
    } else {
      avisarError(envio.error)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Más acciones de «${tituloDe(conversacion)}»`}
        className="ml-auto flex size-11 shrink-0 items-center justify-center rounded-(--radius-md) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) md:size-8"
      >
        <MoreHorizontalIcon aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          className={RENGLON}
          onClick={() => {
            void alternarSilencio()
          }}
        >
          {silenciada ? <BellIcon aria-hidden /> : <BellOffIcon aria-hidden />}
          {silenciada ? 'Dejar de silenciar' : 'Silenciar'}
        </DropdownMenuItem>
        {puedeSalirDe(conversacion) ? (
          <DropdownMenuItem
            className={RENGLON}
            onClick={() => {
              salir.abrir()
            }}
          >
            <LogOutIcon aria-hidden />
            {conversacion.tipo === 'global' ? 'Salir del canal' : 'Salir del grupo'}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
