'use client'

import { PlusIcon, Settings2Icon } from 'lucide-react'
import { CommandGroup, CommandItem, CommandList, CommandSeparator } from '@/shared/ui/command'
import { etiquetaConNombre, filtrarEtiquetas, type Etiqueta } from '../../../entities/etiqueta'
import { InsigniaDeEtiqueta } from './insignia-de-etiqueta'

export const CREAR = '__crear'
export const GESTIONAR = '__gestionar'
const RENGLON = 'min-h-11 md:min-h-8'

// La opción que toma Enter al tipear: la primera coincidencia, o «Crear» si el texto es nuevo. La
// decide el selector, no el orden en que cmdk ve aparecer y desaparecer las opciones.
export function opcionResaltada(lista: readonly Etiqueta[], texto: string): string {
  const primera = filtrarEtiquetas(lista, texto)[0]
  if (primera) {
    return primera.id
  }
  return texto.trim() !== '' && !etiquetaConNombre(texto, lista) ? CREAR : GESTIONAR
}

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
                // Una opción de un listbox de varias: `aria-checked` dice si está puesta (ARIA 1.2).
                data-checked={puesta}
                aria-checked={puesta}
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
