'use client'

import type { Route } from 'next'
import Link from 'next/link'
import type { MouseEvent } from 'react'
import { RUTAS } from '@/shared/lib/rutas'
import {
  textoDeLosDiasEnLaFase,
  type TarjetaDeRepuesto as Tarjeta,
} from '../../../entities/flujo/cadena'

type Props = {
  tarjeta: Tarjeta
  // El instante de la lectura (lo toma el servidor): los días de la fase se cuentan contra él, así el HTML y la hidratación coinciden.
  ahora: Date
  // A dónde lleva la descripción: la URL de ahora con `item=<id>` (clic con Ctrl, otra pestaña con el panel abierto).
  href: string
  alAbrir: (id: string) => void
}

// Un clic común abre el panel sin recargar y suma al historial; con una tecla (Ctrl, Mayús, Alt, Meta) o un botón que no es el principal, el navegador hace lo suyo con el enlace.
function esClicComun(e: MouseEvent): boolean {
  return (
    !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
  )
}

// Un ítem en su columna (8.13-3, D4): la descripción como enlace a su panel, el proyecto (que lleva a su hoja), la cantidad y los días en la fase. Sin foto ni vehículo: leerlos pagaría otra pasada
// de la RLS por tarjeta. Nunca se arrastra: mover es del panel, con su vista previa.
export function TarjetaDeRepuesto({ tarjeta, ahora, href, alAbrir }: Props) {
  const dias = textoDeLosDiasEnLaFase(tarjeta.faseDesde, ahora)
  const proyecto = tarjeta.proyecto.etiqueta
    ? `Proyecto #${String(tarjeta.proyecto.numero)} · ${tarjeta.proyecto.etiqueta}`
    : `Proyecto #${String(tarjeta.proyecto.numero)}`
  return (
    <article className="grid min-w-0 gap-1 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3">
      <Link
        href={href as Route}
        prefetch={false}
        scroll={false}
        data-tarjeta={tarjeta.id}
        onClick={(e) => {
          if (esClicComun(e)) {
            e.preventDefault()
            alAbrir(tarjeta.id)
          }
        }}
        className="flex min-h-11 items-center rounded-(--radius-input) text-(length:--text-sm) font-medium break-words text-(--color-ink) outline-none focus-visible:shadow-(--shadow-focus) md:min-h-0"
      >
        {tarjeta.descripcion}
      </Link>
      <p className="text-(length:--text-xs) break-words text-(--color-ink-soft)">
        <Link
          href={`${RUTAS.repuestos}/${tarjeta.proyecto.id}` as Route}
          prefetch={false}
          className="inline-flex min-h-11 items-center underline-offset-2 hover:underline md:min-h-0"
        >
          {proyecto}
        </Link>
      </p>
      <p className="flex flex-wrap items-center gap-x-2 text-(length:--text-xs) text-(--color-ink-soft)">
        <span>× {tarjeta.cantidad}</span>
        {dias ? <span>{dias}</span> : null}
      </p>
    </article>
  )
}
