'use client'

import { diferido } from '@/shared/ui/diferido'
import { Skeleton } from '@/shared/ui/skeleton'

// El resumen entero llega recién al abrirse: el inventario no carga su drawer, sus pestañas ni sus lecturas para mostrar sus filas. Sin
// red, el aviso va en una barra fija (un panel no tiene lugar propio hasta que abre).
export const ResumenDeVehiculoDiferido = diferido(() =>
  import('./resumen-de-vehiculo').then((modulo) => modulo.ResumenDeVehiculo),
)

const Esqueleto = (
  <div aria-busy="true" className="grid gap-2">
    <Skeleton className="h-4 w-1/3" />
    <Skeleton className="h-4 w-2/3" />
  </div>
)

// Cada pestaña (salvo «Resumen») se pide y se lee al elegirla. Sin red, el aviso va en el lugar de la pestaña.
export const FotosDelResumenDiferido = diferido(
  () => import('./fotos-del-resumen').then((modulo) => modulo.FotosDelResumen),
  { esqueleto: Esqueleto, aviso: 'aqui' },
)

export const InteresadosDelResumenDiferido = diferido(
  () => import('./interesados-del-resumen').then((modulo) => modulo.InteresadosDelResumen),
  { esqueleto: Esqueleto, aviso: 'aqui' },
)
