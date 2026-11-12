'use client'

import { usePathname } from 'next/navigation'
import { useRef, useState } from 'react'
import { useAlDescansar } from '../hooks/use-al-descansar'
import { useNoLeidos } from '../hooks/use-no-leidos'
import { BurbujaDelWidget } from './burbuja-del-widget'
import { PanelDelWidgetDiferido, SuscripcionDeNoLeidosDiferida } from './diferidos'

type Props = {
  // Quién mira: el filtro de Realtime (`usuario_id=eq.<yo>`); la RLS decide igual qué llega.
  usuarioId: string
  zona: string
  // `chat.moderar`: sólo decide lo que se ofrece; la base lo vuelve a exigir.
  puedeModerar: boolean
}

// El widget flotante del chat (7.11): la burbuja con los no leídos y, al abrirla, el panel con la lista y el hilo. Fuera de `/chat` y sus subrutas. En el JS de
// todas las pantallas viaja sólo el botón y el contador; el cliente de Supabase, la suscripción y el panel van diferidos. Quién lo recibe lo decide el servidor
// (`chat.participar` en el hueco). Sin sonido y una sola ventana.
export function WidgetChat({ usuarioId, zona, puedeModerar }: Props) {
  const ruta = usePathname()
  const descansa = useAlDescansar()
  const noLeidos = useNoLeidos()
  const [abierto, setAbierto] = useState(false)
  const burbuja = useRef<HTMLButtonElement>(null)
  const enChat = ruta === '/chat' || ruta.startsWith('/chat/')

  const cerrar = () => {
    setAbierto(false)
    burbuja.current?.focus()
  }

  return (
    <>
      {/* También en `/chat`: la barra lateral lee el mismo contador. */}
      {descansa ? <SuscripcionDeNoLeidosDiferida usuarioId={usuarioId} /> : null}
      {enChat ? null : (
        <>
          <BurbujaDelWidget
            ref={burbuja}
            noLeidos={noLeidos}
            abierto={abierto}
            alAlternar={() => {
              setAbierto((a) => !a)
            }}
          />
          {abierto ? (
            <PanelDelWidgetDiferido
              usuarioId={usuarioId}
              zona={zona}
              puedeModerar={puedeModerar}
              alCerrar={cerrar}
            />
          ) : null}
        </>
      )}
    </>
  )
}
