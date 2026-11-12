'use client'

import { MoreHorizontalIcon, PencilIcon, ReplyIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import type { Mensaje } from '../../../entities/mensajes'
import { puedeEditar, puedeResponder } from '../../../entities/reglas-del-mensaje'
import type { AccionesDelMensaje } from '../acciones-del-hilo'

const RENGLON = 'min-h-11 md:min-h-8'

// El «⋯» de la burbuja, siempre visible: Responder (y, con las partes siguientes, Editar y Borrar). Sin acciones posibles (un mensaje que se está
// enviando, que falló o que ya se borró) no se dibuja. Al elegir una, el foco lo toma quien la atiende y no vuelve al «⋯».
export function MenuDelMensaje({
  mensaje,
  acciones,
}: {
  mensaje: Mensaje
  acciones: AccionesDelMensaje
}) {
  const eligio = useRef(false)
  // El reloj se toma al abrir el menú, no al dibujar: la ventana de edición se mide en ese momento.
  const [ahora, setAhora] = useState(0)
  const responder = puedeResponder(mensaje)
  const editar = puedeEditar(mensaje, acciones.usuarioId, ahora)
  if (!responder) {
    return null
  }
  return (
    <DropdownMenu
      onOpenChange={(abierto) => {
        if (abierto) {
          setAhora(Date.now())
        }
      }}
    >
      <DropdownMenuTrigger
        aria-label="Más acciones del mensaje"
        className="flex size-11 shrink-0 items-center justify-center rounded-(--radius-md) text-(--color-ink-soft) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) md:size-8"
      >
        <MoreHorizontalIcon aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-44"
        finalFocus={() => {
          const elegida = eligio.current
          eligio.current = false
          return !elegida
        }}
      >
        <DropdownMenuItem
          className={RENGLON}
          onClick={() => {
            eligio.current = true
            acciones.responder(mensaje)
          }}
        >
          <ReplyIcon aria-hidden />
          Responder
        </DropdownMenuItem>
        {editar ? (
          <DropdownMenuItem
            className={RENGLON}
            onClick={() => {
              eligio.current = true
              acciones.empezarAEditar(mensaje.id)
            }}
          >
            <PencilIcon aria-hidden />
            Editar
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
