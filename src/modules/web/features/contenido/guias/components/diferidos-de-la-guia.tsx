'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import type { PropsDeLaGuia } from './formulario-de-guia'

// El formulario de la guía se pide al abrir su página: Tiptap y el resto no viajan en otra pantalla.
export const FormularioDeGuiaDiferido = diferido<PropsDeLaGuia>(
  () => import('./formulario-de-guia').then((modulo) => modulo.FormularioDeGuia),
  { esqueleto: <EsqueletoFormulario bloques={3} campos={4} />, aviso: 'aqui' },
)
