'use client'

import type { ComponentProps } from 'react'
import { LugaresDeLaHoja } from './lugares-de-la-hoja'

// Las secciones de la hoja en su propio contenedor (`data-secciones`): su corte de dos columnas depende de lo que le queda cuando el resumen está al costado, no del ancho de la hoja.
// Mientras el resumen va al pie (debajo del corte `@4xl` del contenedor nombrado `hoja`, que no es el de la sección más cercana al input) lo enfocable lleva `scroll-margin-bottom` del alto máximo del resumen (40 % de la ventana): una celda que recibe
// el foco no queda tapada. Al costado ya no hace falta.
const PARA_QUE_EL_PIE_NO_TAPE =
  "[&_:is(input,button,select,[tabindex]):not([tabindex='-1'])]:scroll-mb-[40dvh] @4xl/hoja:[&_:is(input,button,select,[tabindex]):not([tabindex='-1'])]:scroll-mb-0"

export function SeccionesDeLaHoja(props: ComponentProps<typeof LugaresDeLaHoja>) {
  return (
    <div data-secciones="" className={`@container min-w-0 ${PARA_QUE_EL_PIE_NO_TAPE}`}>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 @5xl:grid-cols-2">
        <LugaresDeLaHoja {...props} />
      </div>
    </div>
  )
}
