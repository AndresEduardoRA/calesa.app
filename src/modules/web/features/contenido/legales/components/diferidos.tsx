'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import type { PropsDeLegales } from './formulario-de-legales'

// El formulario de «Legales» se pide al abrir la pestaña: el hueco (`pantallas/sitio-legales.ts`) lo importa `pestanas.ts`, y por él el hub de
// Configuración; con el componente directo, el formulario, Tiptap y su action viajarían en el hub.
export const FormularioDeLegales = diferido<PropsDeLegales>(
  () => import('./formulario-de-legales').then((modulo) => modulo.FormularioDeLegales),
  { esqueleto: <EsqueletoFormulario bloques={2} campos={2} />, aviso: 'aqui' },
)
