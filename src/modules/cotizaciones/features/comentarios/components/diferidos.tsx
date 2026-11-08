'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoDeComentarios } from './esqueleto-de-comentarios'

// La lista de comentarios se pide cuando su sección llega a la pantalla (4.27-2): la página de una guardada no la carga para dibujarse.
export const ComentariosDiferidos = diferido(
  () => import('./comentarios').then((modulo) => modulo.Comentarios),
  { esqueleto: <EsqueletoDeComentarios />, aviso: 'aqui' },
)
