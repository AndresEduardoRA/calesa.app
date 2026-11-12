'use client'

import { useRouter } from 'next/navigation'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelDeDirecta, usePanelDeGrupo } from '../hooks/use-paneles-de-chat'
import { ModalDeDirectaDiferido, ModalDeGrupoDiferido } from './diferidos'

type Props = {
  usuarioId: string
  recargar: () => Promise<void>
}

// Los paneles de la lista de `/chat`, por URL (`?panel=nueva`). Se montan la primera vez que se abren y su código viaja diferido.
export function PanelesDeChat({ usuarioId, recargar }: Props) {
  const router = useRouter()
  const directa = usePanelDeDirecta()
  const montarDirecta = useAbiertoAlgunaVez(directa.abierto)
  const grupo = usePanelDeGrupo()
  const montarGrupo = useAbiertoAlgunaVez(grupo.abierto)
  // La URL nueva ya no trae `panel`: el modal se cierra.
  const abrirConversacion = (conversacion: string) => {
    void recargar()
    router.push(`/chat?c=${conversacion}`)
  }
  return (
    <>
      {montarDirecta ? (
        <ModalDeDirectaDiferido
          abierto={directa.abierto}
          alCerrar={directa.cerrar}
          usuarioId={usuarioId}
          alAbrir={abrirConversacion}
        />
      ) : null}
      {montarGrupo ? (
        <ModalDeGrupoDiferido
          abierto={grupo.abierto}
          alCerrar={grupo.cerrar}
          usuarioId={usuarioId}
          alCrear={abrirConversacion}
        />
      ) : null}
    </>
  )
}
