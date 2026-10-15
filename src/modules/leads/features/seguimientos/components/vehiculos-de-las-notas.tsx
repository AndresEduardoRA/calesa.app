'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { VehiculoDeNota } from '../../../entities/vehiculo-de-nota'

// Los vehículos del lead que quien mira ve (vinculados e interesados), para elegir uno en un
// seguimiento o un recordatorio. Los trae la página (este módulo no lee vehículos) y los provee la
// sección «Seguimientos»; los lee el campo del vehículo del redactor y del recordatorio.
const Contexto = createContext<readonly VehiculoDeNota[]>([])

export function ProveedorDeVehiculos({
  vehiculos,
  children,
}: {
  vehiculos: readonly VehiculoDeNota[]
  children: ReactNode
}) {
  return <Contexto value={vehiculos}>{children}</Contexto>
}

export function useVehiculosDeLasNotas(): readonly VehiculoDeNota[] {
  return useContext(Contexto)
}
