// `render` de las pruebas de la hoja con la URL montada (`NuqsTestingAdapter`): la hoja guarda en la URL lo que abre (`?panel=avanzado`, `?ayuda=texto`). Sólo para las pruebas (el sufijo `.soporte.` lo deja fuera del mapa).
import { render as renderizar } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import type { ReactElement } from 'react'

export const render = (ui: ReactElement, busqueda = '') =>
  renderizar(ui, {
    wrapper: ({ children }) => (
      <NuqsTestingAdapter searchParams={busqueda}>{children}</NuqsTestingAdapter>
    ),
  })
