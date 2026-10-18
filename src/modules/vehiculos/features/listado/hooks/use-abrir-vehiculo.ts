'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { RUTAS } from '@/shared/lib/rutas'

// Qué pasa al elegir un vehículo de la lista (un clic en su fila o su tarjeta, o Enter sobre su nombre): abre su ficha.
export function useAbrirVehiculo() {
  const router = useRouter()
  return (id: string) => {
    router.push(`${RUTAS.vehiculos}/${id}` as Route)
  }
}
