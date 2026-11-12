'use client'

import { useState } from 'react'
import { ATAJOS, esMac, teclasDelAtajo, type ClaveAtajo } from '@/shared/lib/atajos'
import { Button } from '../button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../dialog'

const CLAVES = Object.keys(ATAJOS) as ClaveAtajo[]

type Props = { abierta: boolean; alCambiar: (abierta: boolean) => void }

// «Atajos de teclado»: una fila por atajo del catálogo, en su orden. Una ayuda de sólo lectura y sin nada
// escrito, así que es un `Dialog` sin URL y no un `<Modal>`. La plataforma se lee del navegador al montarse
// (`diferido()` no dibuja en el servidor).
export function ListaDeAtajos({ abierta, alCambiar }: Props) {
  const [mac] = useState(() => typeof navigator !== 'undefined' && esMac(navigator.platform))
  return (
    <Dialog open={abierta} onOpenChange={alCambiar}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Atajos de teclado</DialogTitle>
          <DialogDescription className="sr-only">
            Teclas que funcionan en toda la aplicación.
          </DialogDescription>
        </DialogHeader>
        <dl className="grid gap-2">
          {CLAVES.map((clave) => (
            <FilaDeAtajo key={clave} clave={clave} mac={mac} />
          ))}
        </dl>
        <div className="flex justify-end">
          <DialogClose render={<Button variant="outline" className="min-h-11 md:min-h-8" />}>
            Cerrar
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FilaDeAtajo({ clave, mac }: { clave: ClaveAtajo; mac: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <dt className="text-(length:--text-sm) text-(--color-ink)">{ATAJOS[clave].descripcion}</dt>
      <dd className="flex gap-1">
        {teclasDelAtajo(clave, { mac }).map((tecla) => (
          <kbd
            key={tecla}
            className="rounded-(--radius-sm) border border-(--color-line) px-1.5 font-mono text-(length:--text-xs)"
          >
            {tecla}
          </kbd>
        ))}
      </dd>
    </div>
  )
}
