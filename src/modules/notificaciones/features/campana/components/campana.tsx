'use client'

import { BellIcon } from 'lucide-react'
import { useCallback, useState } from 'react'
import { conteoCorto, conteoEnFrase, type ConteoAcotado } from '@/shared/lib/conteo'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { ContenidoDeLaCampanaDiferido, SuscripcionDeLaCampanaDiferida } from './diferidos'
import { useAlDescansar } from '../hooks/use-al-descansar'
import { useVueltaDeLaRed } from '../hooks/use-vuelta-de-la-red'
import type { AccionesPorTipo } from '../../lista/components/fila-de-notificacion'

type Props = {
  // Quién mira: el filtro de Realtime (`usuario_id=eq.<yo>`); la RLS decide igual qué llega.
  usuarioId: string
  // Los caminos con pantalla, para no enlazar un aviso a una que todavía no existe.
  disponibles: readonly string[]
  acciones?: AccionesPorTipo
}

// La campana de la barra superior: el contador de no leídas (hasta «9+») y el popover con las últimas. En el
// celular mide 44 px (en px, no en rem: con el texto al 200 % no se duplica).
export function Campana({ usuarioId, disponibles, acciones }: Props) {
  const [conteo, setConteo] = useState<ConteoAcotado | null>(null)
  // Sube con cada señal de Realtime: el popover abierto relee su lista.
  const [version, setVersion] = useState(0)
  const alSenal = useCallback(() => {
    setVersion((n) => n + 1)
  }, [])
  const [abierta, setAbierta] = useState(false)
  const descansa = useAlDescansar()
  // Pedida sin red, la suscripción queda en «Sin conexión»: al volver la red se monta de nuevo y se suscribe sola.
  const vuelta = useVueltaDeLaRed()
  const sinLeer = conteo !== null && conteo.n > 0 ? conteo : null

  return (
    <>
      {descansa ? (
        <SuscripcionDeLaCampanaDiferida
          key={vuelta}
          usuarioId={usuarioId}
          alConteo={setConteo}
          alSenal={alSenal}
        />
      ) : null}
      <Popover open={abierta} onOpenChange={setAbierta}>
        <PopoverTrigger
          aria-label={
            sinLeer ? `Notificaciones, ${conteoEnFrase(sinLeer)} sin leer` : 'Notificaciones'
          }
          className="relative inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-(--radius-md) text-(--color-ink) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) md:h-9 md:w-9"
        >
          <BellIcon aria-hidden className="size-4" />
          {sinLeer ? (
            <span
              aria-hidden
              data-contador-de-notificaciones=""
              className="absolute top-1 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-(--color-peligro) px-1 text-[10px] leading-none font-medium text-white tabular-nums md:top-0 md:-right-0.5"
            >
              {conteoCorto(sinLeer)}
            </span>
          ) : null}
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-96 max-w-[calc(100vw-1rem)] p-1"
          aria-label="Notificaciones"
        >
          <ContenidoDeLaCampanaDiferido
            version={version}
            disponibles={disponibles}
            acciones={acciones}
            alCerrar={() => {
              setAbierta(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </>
  )
}
