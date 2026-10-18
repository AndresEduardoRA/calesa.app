'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoDeSeguimientos } from '../../seguimientos/components/esqueleto-de-seguimientos'

// Cada pestaña se pide recién al elegirla: el listado no carga la línea de tiempo, los recordatorios
// ni sus modales para mostrar sus filas. Sin red, el aviso va en el lugar de la pestaña.
export const SeguimientosDelRapidoDiferido = diferido(
  () => import('./seguimientos-del-rapido').then((modulo) => modulo.SeguimientosDelRapido),
  { esqueleto: <EsqueletoDeSeguimientos />, aviso: 'aqui' },
)

export const RecordatoriosDelRapidoDiferido = diferido(
  () => import('./recordatorios-del-rapido').then((modulo) => modulo.RecordatoriosDelRapido),
  { esqueleto: <EsqueletoDeSeguimientos />, aviso: 'aqui' },
)

// El panel de edición del resumen: se pide al pulsar «Editar», no al abrir el resumen. Sin red, el aviso va en una barra fija.
export const EdicionDelResumenDiferido = diferido(() =>
  import('./edicion-del-resumen').then((modulo) => modulo.EdicionDelResumen),
)
