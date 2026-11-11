'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { fechaRelativa } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { useRegional } from '@/shared/ui/regional'
import { destinoDe } from '../../../entities/destino'
import type { Notificacion } from '../../../entities/notificacion'
import { IconoDeTipo } from './icono-de-tipo'

// La acción propia de un tipo (p. ej. «Contacté» de un turno web): la dibuja `app/` (`_shell/huecos/`), porque una
// función no cruza de servidor a cliente. Un tipo sin entrada no lleva botón.
export type AccionesPorTipo = Readonly<Record<string, (aviso: Notificacion) => ReactNode>>

type Props = {
  aviso: Notificacion
  // Los caminos con pantalla: una `ruta` fuera de ellos no se enlaza (`destinoDe`).
  disponibles: readonly string[]
  acciones?: AccionesPorTipo
  // Ya se vio leída en esta sesión (la lectura todavía no lo trae).
  leidaAqui: boolean
  // Se abrió: quien lo pasa lo marca leído (y accionado, si su tipo lo dice).
  alAbrir: (aviso: Notificacion) => void
  // Tras ir a su pantalla (la campana se cierra).
  alIr?: () => void
}

const CLASE_DEL_CUERPO =
  'flex min-w-0 flex-1 items-start gap-3 rounded-(--radius-md) p-2 text-left outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus)'

// Lo que se ve de un aviso: icono, título, cuerpo, cuándo, y si pide acción o está sin leer (con texto, no sólo color).
function CuerpoDeLaFila({
  aviso,
  leida,
  sinPantalla,
}: {
  aviso: Notificacion
  leida: boolean
  sinPantalla: boolean
}) {
  const { zonaHoraria } = useRegional()
  const pideAccion = aviso.requiereAccion && !aviso.accionada
  return (
    <>
      <IconoDeTipo tipo={aviso.tipo} className="mt-0.5 size-4 shrink-0 text-(--color-ink-soft)" />
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={
              leida
                ? 'min-w-0 break-words text-(--color-ink-soft)'
                : 'min-w-0 font-medium break-words text-(--color-ink)'
            }
          >
            {aviso.titulo}
          </span>
          {pideAccion ? <Badge variant="secondary">Pide acción</Badge> : null}
          {leida ? null : <span className="sr-only">Sin leer</span>}
        </span>
        {aviso.cuerpo ? (
          <span className="min-w-0 text-(length:--text-sm) break-words text-(--color-ink-soft)">
            {aviso.cuerpo}
          </span>
        ) : null}
        <span className="text-(length:--text-xs) text-(--color-ink-faint)">
          {fechaRelativa(aviso.creadoEn, { zona: zonaHoraria })}
        </span>
        {sinPantalla ? (
          <span role="status" className="text-(length:--text-xs) text-(--color-ink-soft)">
            Esa pantalla todavía no está disponible
          </span>
        ) : null}
      </span>
      {leida ? null : (
        <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-(--color-primario)" />
      )}
    </>
  )
}

// Un aviso, en la campana y en `/notificaciones` (una sola fila, dos lugares). Con pantalla es un enlace; sin
// pantalla, un botón que dice que todavía no está; sin ruta, un botón que sólo lo marca leído.
export function FilaDeNotificacion({
  aviso,
  disponibles,
  acciones,
  leidaAqui,
  alAbrir,
  alIr,
}: Props) {
  const [sinPantalla, setSinPantalla] = useState(false)
  const destino = destinoDe(aviso.ruta, disponibles)
  const cuerpo = (
    <CuerpoDeLaFila aviso={aviso} leida={aviso.leida || leidaAqui} sinPantalla={sinPantalla} />
  )
  const accion = acciones?.[aviso.tipo]?.(aviso)

  return (
    <li className="min-w-0" data-notificacion={aviso.id}>
      <div className="flex min-w-0 flex-col gap-1">
        {destino.tipo === 'enlace' ? (
          <Link
            href={destino.href as Route}
            className={CLASE_DEL_CUERPO}
            onClick={() => {
              alAbrir(aviso)
              alIr?.()
            }}
          >
            {cuerpo}
          </Link>
        ) : (
          <button
            type="button"
            className={CLASE_DEL_CUERPO}
            onClick={() => {
              alAbrir(aviso)
              setSinPantalla(destino.tipo === 'sin-pantalla')
            }}
          >
            {cuerpo}
          </button>
        )}
        {accion ? <div className="pr-2 pl-9">{accion}</div> : null}
      </div>
    </li>
  )
}
