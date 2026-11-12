'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import type { PropsDeFormularioDeFicha } from './formulario-de-ficha'

// El formulario de la ficha se pide al abrir el bloque, no al dibujar `/perfil` (`.claude/rules/escala.md`).
export const FormularioDeFichaDiferido = diferido<PropsDeFormularioDeFicha>(
  () => import('./formulario-de-ficha').then((modulo) => modulo.FormularioDeFicha),
  { esqueleto: <EsqueletoFormulario bloques={1} campos={4} />, aviso: 'aqui' },
)
