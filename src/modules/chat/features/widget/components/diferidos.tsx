'use client'

import { diferido } from '@/shared/ui/diferido'

// El contador y Realtime se piden al hidratar el marco, no viajan en el JS en frío de la pantalla.
export const SuscripcionDeNoLeidosDiferida = diferido(() =>
  import('./suscripcion-de-no-leidos').then((modulo) => modulo.SuscripcionDeNoLeidos),
)

// El panel (lista, hilo y redactor) se pide al abrir la burbuja.
export const PanelDelWidgetDiferido = diferido(() =>
  import('./panel-del-widget').then((modulo) => modulo.PanelDelWidget),
)
