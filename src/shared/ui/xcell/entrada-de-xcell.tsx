'use client'

import type { ChangeEvent, FocusEvent, KeyboardEvent } from 'react'
import { Input } from '@base-ui/react/input'
import { useLive } from '../live'
import { ENTRADA } from './clases'

export type TeclaDeCierre = 'enter' | 'tab' | 'esc'

type Props = {
  texto: string
  // Cómo queda el texto al abrir: todo seleccionado (se abrió con Enter, F2 o un clic) o el cursor al final (se abrió tipeando).
  seleccion: 'todo' | 'final'
  nombre: string
  describedby: string | undefined
  invalido: boolean
  alEscribir: (texto: string) => void
  alCerrar: (tecla: TeclaDeCierre, evento: KeyboardEvent<HTMLInputElement>) => void
  alPerderElFoco: () => void
}

// Un campo de contraseña que se vacía solo invita a «Guardar contraseña». Las marcas de 1Password, LastPass, Bitwarden y Dashlane lo
// evitan; Chrome no tiene una propia y no se puede probar con el Chromium de Playwright (no trae gestor): ver `CLAUDE.md`.
const MARCAS_DE_GESTORES = {
  'data-1p-ignore': 'true',
  'data-lpignore': 'true',
  'data-bwignore': 'true',
  'data-form-type': 'other',
}

// Estable a propósito: React sólo la llama al montar la entrada. Una función nueva por render la volvería a llamar con cada tecla y
// devolvería el cursor al final (o seleccionaría todo) a mitad de lo que se tipea.
function alMontar(elemento: HTMLElement | null) {
  if (!(elemento instanceof HTMLInputElement)) {
    return
  }
  elemento.focus()
  if (elemento.dataset['seleccion'] === 'todo') {
    elemento.select()
  } else {
    elemento.setSelectionRange(elemento.value.length, elemento.value.length)
  }
}

// La entrada que reemplaza al botón del valor. `Enter`, `Esc` y `Tab` los resuelve la celda: acá sólo se avisa cuál fue.
export function EntradaDeXCell(props: Props) {
  const { texto, seleccion, nombre, describedby, invalido, alEscribir, alCerrar, alPerderElFoco } =
    props
  // Con el Modo Live encendido la cifra que se tipea no se ve ni la lee un lector de pantalla: sólo un campo de contraseña la saca del
  // árbol de accesibilidad (`-webkit-text-security` tapa lo dibujado pero deja el valor a la vista de un lector; medido con CDP en 4.12-1).
  const { live } = useLive()

  function alTeclear(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === 'Enter') {
      // Sin esto el `keypress` de este Enter cae en el botón que ocupa su lugar y vuelve a abrir la edición.
      evento.preventDefault()
      alCerrar('enter', evento)
    } else if (evento.key === 'Escape') {
      // Esc cancela la celda y no cierra el modal o el panel que la contiene.
      evento.preventDefault()
      evento.stopPropagation()
      alCerrar('esc', evento)
    } else if (evento.key === 'Tab') {
      // Sin `preventDefault`: Tab sigue su camino a la celda que viene. La celda lo frena sólo si lo escrito no es un número.
      alCerrar('tab', evento)
    }
  }

  return (
    <Input
      ref={alMontar}
      type={live ? 'password' : 'text'}
      inputMode="decimal"
      autoComplete="off"
      {...(live ? MARCAS_DE_GESTORES : {})}
      spellCheck={false}
      aria-label={nombre}
      aria-invalid={invalido || undefined}
      aria-describedby={describedby}
      data-seleccion={seleccion}
      className={ENTRADA}
      value={texto}
      onChange={(evento: ChangeEvent<HTMLInputElement>) => {
        alEscribir(evento.target.value)
      }}
      onKeyDown={alTeclear}
      onBlur={(_: FocusEvent<HTMLInputElement>) => {
        alPerderElFoco()
      }}
    />
  )
}
