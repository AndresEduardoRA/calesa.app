'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoListado } from '@/shared/ui/esqueletos'
import type { PropsDeLaPestanaDeGuias } from './pestana-de-guias'

// La pestaña «Guías» se pide al abrirla: el hueco (`pantallas/sitio-guias.ts`) lo importa `pestanas.ts`, y por él el hub de Configuración;
// con el componente directo, la lista, el panel de alta y su action viajarían en el hub.
export const PestanaDeGuias = diferido<PropsDeLaPestanaDeGuias>(
  () => import('./pestana-de-guias').then((modulo) => modulo.PestanaDeGuias),
  { esqueleto: <EsqueletoListado filas={5} columnas={4} />, aviso: 'aqui' },
)
