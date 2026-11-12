'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoListado } from '@/shared/ui/esqueletos/esqueleto-listado'
import type { ListaDeCategorias } from '../../../../entities/contenido/categorias'

// El cuerpo del panel «Categorías» se pide al abrirlo: con la lista y sus cinco actions directas, viajarían en la pestaña «Guías».
export const CuerpoDeCategorias = diferido<{ lista: ListaDeCategorias }>(
  () => import('./cuerpo-de-categorias').then((modulo) => modulo.CuerpoDeCategorias),
  { esqueleto: <EsqueletoListado filas={4} columnas={2} />, aviso: 'pantalla' },
)
