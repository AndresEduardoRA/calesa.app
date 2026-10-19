'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsperaDelAlta } from './espera-del-alta'

// «Nuevo lead» con todo lo suyo (la lectura de lo que necesita, el estado del alta, los campos, el redactor) se pide la primera vez que se
// abre: el shell lo monta en **todas** las pantallas y no puede cargarlo (ni leer nada) para dibujar un botón. Mientras llega el código,
// el drawer ya está abierto con su esqueleto.
export const AltaConDatos = diferido<object>(
  () => import('./alta-con-datos').then((m) => m.AltaConDatos),
  { esqueleto: <EsperaDelAlta /> },
)

// Pide el código del alta y empieza a leer lo que necesita, sin abrir nada: se llama cuando el puntero llega al botón, cuando toma el foco
// y con la tecla `N`. Así el clic encuentra todo listo, o casi. Un fallo acá no se dice: nadie pidió nada todavía.
export function adelantarElAlta() {
  void import('./alta-con-datos')
    .then((m) => {
      m.adelantarLaLectura()
    })
    .catch(() => undefined)
}
