'use client'

import { MegaphoneIcon, MessageSquarePlusIcon, UserRoundPlusIcon, UsersIcon } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { avisarError } from '@/shared/ui/toasts'
import { entrarAlGlobal } from '../actions/entrar-al-global'
import { MENSAJE_DE_VALIDACION } from '../../resultado'
import { usePanelDeDirecta, usePanelDeGrupo } from '../hooks/use-paneles-de-chat'

const RENGLON = 'min-h-11 md:min-h-8'

type Props = {
  // Con `chat.global` se ofrece el canal del equipo (la base lo vuelve a exigir).
  puedeGlobal: boolean
  recargar: () => Promise<void>
}

// «Nueva conversación»: un mensaje directo, y con `chat.global`, entrar al canal del equipo.
export function MenuDeNuevaConversacion({ puedeGlobal, recargar }: Props) {
  const router = useRouter()
  const directa = usePanelDeDirecta()
  const grupo = usePanelDeGrupo()
  const entrar = useAction(entrarAlGlobal)

  async function entrarAlCanal() {
    const envio = await enviarAccion(entrar.executeAsync(), MENSAJE_DE_VALIDACION)
    if (!envio.ok) {
      avisarError(envio.error)
      return
    }
    await recargar()
    router.push(`/chat?c=${envio.data.id}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="outline" className="h-11 md:h-8">
            <MessageSquarePlusIcon aria-hidden />
            Nueva conversación
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem
          className={RENGLON}
          onClick={() => {
            directa.abrir()
          }}
        >
          <UserRoundPlusIcon aria-hidden />
          Mensaje directo
        </DropdownMenuItem>
        <DropdownMenuItem
          className={RENGLON}
          onClick={() => {
            grupo.abrir()
          }}
        >
          <UsersIcon aria-hidden />
          Nuevo grupo
        </DropdownMenuItem>
        {puedeGlobal ? (
          <DropdownMenuItem
            className={RENGLON}
            onClick={() => {
              void entrarAlCanal()
            }}
          >
            <MegaphoneIcon aria-hidden />
            Entrar al canal del equipo
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
