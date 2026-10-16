'use client'

import dynamic from 'next/dynamic'
import { EsqueletoDeSeguimientos } from '../../seguimientos/components/esqueleto-de-seguimientos'

// La pestaña «Seguimientos» se pide recién al elegirla: el listado no carga la línea de tiempo, los
// recordatorios ni sus modales para mostrar sus filas.
export const SeguimientosDelRapidoDiferido = dynamic(
  () => import('./seguimientos-del-rapido').then((modulo) => modulo.SeguimientosDelRapido),
  { ssr: false, loading: () => <EsqueletoDeSeguimientos /> },
)
