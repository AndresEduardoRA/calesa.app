'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import type { PropsDelFormularioDeLaPolitica } from './formulario-de-la-politica'

// El formulario de la política viaja aparte: el tablero se muestra sin cargar su código (va plegado al final de la pantalla).
export const FormularioDeLaPolitica = diferido<PropsDelFormularioDeLaPolitica>(
  () => import('./formulario-de-la-politica').then((modulo) => modulo.FormularioDeLaPolitica),
  { esqueleto: <EsqueletoFormulario bloques={1} campos={5} />, aviso: 'aqui' },
)
