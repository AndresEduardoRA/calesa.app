'use client'

import { PlusIcon, Settings2Icon } from 'lucide-react'
import { CommandGroup, CommandItem, CommandList, CommandSeparator } from '@/shared/ui/command'
import type { Etiqueta } from '../../../entities/etiqueta'
import { InsigniaDeEtiqueta } from './insignia-de-etiqueta'

const CREAR = '__crear'
const GESTIONAR = '__gestionar'
const RENGLON = 'min-h-11 md:min-h-8'

type Props = {
  // Las que coinciden con lo tipeado.
  visibles: readonly Etiqueta[]
  puestas: readonly string[]
  // Lo tipeado, si no es el nombre de una que ya existe: se ofrece crearla.
  nueva: string | null
  // El lead ya tiene el tope: las que no tiene no se pueden marcar.
  lleno: boolean
  enCurso: boolean
  creando: boolean
  alCambiar: (id: string, valor: boolean) => void
  alCrear: () => void
  alGestionar: () => void
}

// Las opciones del selector: las etiquetas que coinciden (marcadas las del lead), «Crear» al final y
// «Gestionar etiquetas». Cada opción dice su estado con `aria-checked`.
export function OpcionesDeEtiquetas(props: Props) {
  const { visibles, puestas, nueva, lleno, enCurso, alCambiar } = props
  return (
    <CommandList>
      {visibles.length === 0 && nueva === null ? (
        <p className="px-3 py-4 text-(length:--text-sm) text-(--color-ink-soft)">
          Todavía no tienes etiquetas. Escribe un nombre y presiona Enter para crear una.
        </p>
      ) : (
        <CommandGroup>
          {visibles.map((etiqueta) => {
            const puesta = puestas.includes(etiqueta.id)
            return (
              <CommandItem
                key={etiqueta.id}
                value={etiqueta.id}
                data-checked={puesta}
                aria-checked={puesta}
                role="menuitemcheckbox"
                disabled={enCurso || (!puesta && lleno)}
                className={RENGLON}
                onSelect={() => {
                  alCambiar(etiqueta.id, !puesta)
                }}
              >
                <InsigniaDeEtiqueta etiqueta={etiqueta} />
              </CommandItem>
            )
          })}
          {nueva === null ? null : (
            <CommandItem
              value={CREAR}
              disabled={props.creando}
              className={RENGLON}
              onSelect={props.alCrear}
            >
              <PlusIcon aria-hidden />
              <span className="truncate">Crear «{nueva}»</span>
            </CommandItem>
          )}
        </CommandGroup>
      )}
      <CommandSeparator />
      <CommandGroup>
        <CommandItem value={GESTIONAR} className={RENGLON} onSelect={props.alGestionar}>
          <Settings2Icon aria-hidden />
          Gestionar etiquetas
        </CommandItem>
      </CommandGroup>
    </CommandList>
  )
}
