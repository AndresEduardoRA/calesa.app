'use client'

import { useId } from 'react'
import { cn } from 'cn'
import {
  CLAVES_DE_ICONO,
  NOMBRE_DE_ICONO,
  esClaveDeIcono,
  type ClaveDeIcono,
} from '@/shared/lib/iconos'
import { IconoDelCatalogo } from './icono-del-catalogo/icono-del-catalogo'

type Props = {
  // La clave que tiene hoy; una que no es del catálogo (una fila escrita por fuera) se muestra como «Sin icono».
  valor: string | null | undefined
  alElegir: (clave: ClaveDeIcono | null) => void
  // El `id` del primer radio («Sin icono»): a donde va el foco si el icono tiene un error.
  idDelPrimero?: string | undefined
  error?: string | undefined
  deshabilitado?: boolean
}

// Elegir el icono de un origen o de un tipo, del catálogo cerrado: «Sin icono» y las 24 claves, cada una con su nombre dicho con texto.
// Son radios nativos (las flechas, el foco y el lector de pantalla funcionan sin escribir nada) en baldosas de 44 px —en píxeles, no en
// rem, para que sigan siendo un blanco táctil— que se reacomodan al ancho que haya, también con el texto al 200 %.
export function SelectorDeIcono({ valor, alElegir, idDelPrimero, error, deshabilitado }: Props) {
  const grupo = useId()
  const idDelError = `${grupo}-error`
  const elegido = esClaveDeIcono(valor) ? valor : null
  const baldosa = cn(
    'grid min-h-[44px] place-items-center rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-2 text-(--color-ink)',
    'peer-checked:border-(--color-primario) peer-checked:bg-(--color-surface-2) peer-checked:text-(--color-primario)',
    'peer-focus-visible:shadow-(--shadow-focus) peer-disabled:opacity-60',
  )
  return (
    <fieldset
      className="grid min-w-0 gap-1.5"
      disabled={deshabilitado}
      aria-describedby={error ? idDelError : undefined}
    >
      <legend className="mb-1 text-(length:--text-sm) font-medium text-(--color-ink)">Icono</legend>
      <div className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1.5">
        <label className="col-span-full min-w-0 cursor-pointer">
          <input
            id={idDelPrimero}
            type="radio"
            name={grupo}
            value=""
            checked={elegido === null}
            className="peer sr-only"
            onChange={() => {
              alElegir(null)
            }}
          />
          <span className={cn(baldosa, 'text-(length:--text-sm)')}>Sin icono</span>
        </label>
        {CLAVES_DE_ICONO.map((clave) => (
          <label key={clave} className="min-w-0 cursor-pointer" title={NOMBRE_DE_ICONO[clave]}>
            <input
              type="radio"
              name={grupo}
              value={clave}
              aria-label={NOMBRE_DE_ICONO[clave]}
              checked={elegido === clave}
              className="peer sr-only"
              onChange={() => {
                alElegir(clave)
              }}
            />
            <span className={baldosa}>
              <IconoDelCatalogo clave={clave} className="size-5" />
            </span>
          </label>
        ))}
      </div>
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        Opcional: se dibuja junto al nombre.
      </p>
      {error ? (
        <p id={idDelError} className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
