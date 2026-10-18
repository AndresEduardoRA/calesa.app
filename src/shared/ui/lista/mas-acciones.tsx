'use client'

import { MoreHorizontalIcon } from 'lucide-react'
import { useState, type ReactNode, type Ref } from 'react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../dropdown-menu'
import type { AccionDeMenu } from './acciones'

// Alto de un renglón del menú: cómodo para el dedo en el celular, compacto con mouse.
const RENGLON = 'min-h-11 md:min-h-8'

type Props = {
  // De qué: «Más acciones de Ana Rojas». Es el nombre accesible del botón, igual en toda la app.
  nombre: string
  // Las líneas, ya filtradas por lo que la persona puede hacer y en su orden (la lista es del módulo, en `entities/`).
  acciones: readonly AccionDeMenu[]
  // Identifica este botón en el DOM (`data-mas-acciones`): un modal que se abre desde el menú le devuelve el foco al que se ve.
  id?: string
  // Para anclar contra el botón lo que se abre después (el selector de etiquetas).
  botonRef?: Ref<HTMLButtonElement>
  // Lo que se abre desde el menú, junto al botón (un selector que se ancla a él).
  children?: ReactNode
}

function Linea({ accion, alElegir }: { accion: AccionDeMenu; alElegir: (clave: string) => void }) {
  switch (accion.tipo) {
    case 'separador':
      return <DropdownMenuSeparator />
    case 'nota':
      // Un párrafo y no una etiqueta de menú: esas sólo valen dentro de un grupo.
      return (
        <p className="px-1.5 py-1.5 text-(length:--text-xs) text-(--color-ink-faint)">
          {accion.texto}
        </p>
      )
    case 'casilla':
      return (
        <DropdownMenuCheckboxItem
          className={RENGLON}
          checked={accion.marcada}
          disabled={accion.deshabilitada ?? false}
          closeOnClick={accion.cierra ?? false}
          onCheckedChange={accion.alCambiar}
        >
          {accion.etiqueta}
        </DropdownMenuCheckboxItem>
      )
    case 'accion':
      return (
        <DropdownMenuItem
          className={RENGLON}
          variant={accion.destructiva ? 'destructive' : 'default'}
          disabled={accion.deshabilitada ?? false}
          onClick={() => {
            alElegir(accion.clave)
          }}
        >
          {accion.icono}
          {accion.etiqueta}
        </DropdownMenuItem>
      )
  }
}

// El «⋯» de una fila, una tarjeta, un resumen o una ficha: un botón de 44 px en el celular (32 desde `md`) y sus líneas en el
// orden que dice el módulo. Nada de lo que pasa adentro abre la fila de la lista (los clics no suben: `esClicPropio` ve el botón, y
// el menú se dibuja en un portal). Lo que abre algo encima (`despuesDeCerrar`) espera a que el menú termine de cerrarse: si no, el
// foco que vuelve al botón lo cierra.
export function MasAcciones({ nombre, acciones, id, botonRef, children }: Props) {
  const [pendiente, setPendiente] = useState<string | null>(null)

  function elegir(clave: string) {
    const accion = acciones.find((a) => a.tipo === 'accion' && a.clave === clave)
    if (accion?.tipo !== 'accion') {
      return
    }
    if (accion.despuesDeCerrar) {
      setPendiente(clave)
    } else {
      accion.alElegir()
    }
  }

  return (
    <div className="flex justify-end">
      <DropdownMenu
        onOpenChangeComplete={(abierto) => {
          if (abierto || pendiente === null) {
            return
          }
          setPendiente(null)
          const accion = acciones.find((a) => a.tipo === 'accion' && a.clave === pendiente)
          if (accion?.tipo === 'accion') {
            accion.alElegir()
          }
        }}
      >
        <DropdownMenuTrigger
          ref={botonRef}
          aria-label={`Más acciones de ${nombre}`}
          data-mas-acciones={id}
          className="flex size-[44px] items-center justify-center rounded-(--radius-md) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) md:size-8"
        >
          <MoreHorizontalIcon aria-hidden className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {acciones.map((accion) => (
            <Linea key={accion.clave} accion={accion} alElegir={elegir} />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {children}
    </div>
  )
}
