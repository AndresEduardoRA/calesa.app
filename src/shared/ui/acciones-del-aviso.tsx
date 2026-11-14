'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { cn } from 'cn'
import {
  hrefDePanel,
  type AccionDelAviso,
  type AccionesDeUnAviso,
} from '@/shared/lib/acciones-del-aviso'
import { Button } from './button'
import { salirSinPerder } from './salida-con-cambios'

type Props = {
  resueltas: AccionesDeUnAviso
  // Lo que hacen las acciones que no navegan. Sin manejador, `reintentar` y `deshacer` no se dibujan (un botón que no hace nada no se ofrece)
  // y `recargar` recarga la página.
  alReintentar?: () => void
  alDeshacer?: () => void
  alRecargar?: () => void
  // Se hizo alguna: el toast se cierra.
  alElegir?: () => void
  // Un aviso que bloquea lleva el foco a la acción principal al aparecer.
  enfocar?: boolean
  className?: string
}

// Las acciones de un aviso (`lib/acciones-del-aviso.ts`): todo es un `<Button>` —también `ir` y `panel`, que hacen `router.push`—, porque
// dentro de un toast sólo los botones reciben el puntero. La principal (la primera) es la que destraba; en el celular va a lo ancho y todas
// miden 44 px. Sin permiso para la acción que resuelve, el texto dice a quién pedírselo.
export function AccionesDelAviso({
  resueltas,
  alReintentar,
  alDeshacer,
  alRecargar,
  alElegir,
  enfocar = false,
  className,
}: Props) {
  const router = useRouter()
  const principal = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    if (enfocar) {
      principal.current?.focus()
    }
  }, [enfocar])

  const botones = resueltas.acciones.filter(
    (accion) =>
      (accion.tipo !== 'reintentar' || alReintentar !== undefined) &&
      (accion.tipo !== 'deshacer' || alDeshacer !== undefined),
  )
  if (botones.length === 0 && resueltas.pedido === null) {
    return null
  }

  function hacer(accion: AccionDelAviso) {
    switch (accion.tipo) {
      case 'ir':
        salirSinPerder(() => {
          router.push(accion.ruta as Route)
        })
        break
      case 'panel':
        salirSinPerder(() => {
          router.push(
            hrefDePanel(accion, window.location.pathname, window.location.search) as Route,
          )
        })
        break
      case 'reintentar':
        alReintentar?.()
        break
      case 'deshacer':
        alDeshacer?.()
        break
      case 'recargar':
        if (alRecargar) {
          alRecargar()
        } else {
          salirSinPerder(() => {
            window.location.reload()
          })
        }
        break
    }
    alElegir?.()
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {resueltas.pedido === null ? null : <p>{resueltas.pedido}</p>}
      {botones.length === 0 ? null : (
        <div className="flex flex-wrap gap-2">
          {botones.map((accion, indice) => (
            <Button
              key={`${accion.tipo}-${accion.etiqueta}`}
              ref={indice === 0 ? principal : undefined}
              size="sm"
              variant={indice === 0 ? 'default' : 'outline'}
              className={cn('min-h-11 md:min-h-7', indice === 0 && 'w-full md:w-auto')}
              onClick={() => {
                hacer(accion)
              }}
            >
              {accion.etiqueta}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
