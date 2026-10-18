'use client'

import type { ComponentProps } from 'react'
import { cn } from 'cn'

type Props = Omit<ComponentProps<'button'>, 'type' | 'onClick' | 'aria-label'> & {
  // El nombre de lo que abre («Ana Rojas»): el lector anuncia «Abrir Ana Rojas».
  nombre: string
}

// El nombre de una fila o una tarjeta, como botón: la parada de Tab de la fila (una por fila) y lo que abre su resumen con Enter o
// Espacio. No tiene `onClick` propio: su clic sube a la fila (`<FilaDeLista>`, `<TarjetaDeLista>`), que abre una sola vez; por eso
// sólo sirve dentro de una de las dos.
export function AbrirResumen({ nombre, className, ...props }: Props) {
  return (
    <button
      type="button"
      data-abre-resumen=""
      aria-label={`Abrir ${nombre}`}
      title={nombre}
      className={cn(
        'text-left underline-offset-2 outline-none hover:underline focus-visible:shadow-(--shadow-focus)',
        className,
      )}
      {...props}
    />
  )
}
