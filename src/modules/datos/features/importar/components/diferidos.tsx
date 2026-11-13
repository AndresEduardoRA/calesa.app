'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'

// La sección «Importar» se pide recién al abrirla (D49): quien sólo exporta no paga el asistente ni las reglas de leads y vehículos.
export const SeccionImportarDiferida = diferido(
  () => import('./seccion-importar').then((modulo) => modulo.SeccionImportar),
  { esqueleto: <EsqueletoFormulario bloques={1} campos={3} />, aviso: 'aqui' },
)
