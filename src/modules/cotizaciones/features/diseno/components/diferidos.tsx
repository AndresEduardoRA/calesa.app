'use client'

import { diferido } from '@/shared/ui/diferido'

// La pestaña «Diseño» (4.22-2) trae el validador del diseño y el editor: Configuración › Cotización no los carga para mostrar sus otras pestañas.
export const DisenoDelOrigenDiferido = diferido(
  () => import('./diseno-del-origen').then((modulo) => modulo.DisenoDelOrigen),
  { aviso: 'aqui' },
)
