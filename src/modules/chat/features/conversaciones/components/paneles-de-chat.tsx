'use client'

import { useRouter } from 'next/navigation'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelDeDirecta } from '../hooks/use-paneles-de-chat'
import { ModalDeDirectaDiferido } from './diferidos'

type Props = {
  usuarioId: string
  recargar: () => Promise<void>
}

// Los paneles de la lista de `/chat`, por URL (`?panel=nueva`). Se montan la primera vez que se abren y su código viaja diferido.
export function PanelesDeChat({ usuarioId, recargar }: Props) {
  const router = useRouter()
  const directa = usePanelDeDirecta()
  const montarDirecta = useAbiertoAlgunaVez(directa.abierto)
  return (
    <>
      {montarDirecta ? (
        <ModalDeDirectaDiferido
          abierto={directa.abierto}
          alCerrar={directa.cerrar}
          usuarioId={usuarioId}
          alAbrir={(conversacion) => {
            void recargar()
            // La URL nueva ya no trae `panel`: el modal se cierra.
            router.push(`/chat?c=${conversacion}`)
          }}
        />
      ) : null}
    </>
  )
}
