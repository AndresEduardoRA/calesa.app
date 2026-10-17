'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { VehiculoDeNota } from '../../../entities/vehiculo-de-nota'

// Los vehículos del lead que quien mira ve (vinculados e interesados), para elegir uno en un
// seguimiento o un recordatorio. Los trae la página (este módulo no lee vehículos) y los provee la
// sección «Seguimientos»; los lee el campo del vehículo del redactor y del recordatorio.
const Contexto = createContext<{ vehiculos: readonly VehiculoDeNota[]; recortado: boolean }>({
  vehiculos: [],
  recortado: false,
})

export function ProveedorDeVehiculos({
  vehiculos,
  recortado = false,
  children,
}: {
  vehiculos: readonly VehiculoDeNota[]
  // La lectura llegó a su tope (cierre 1): el campo lo dice.
  recortado?: boolean
  children: ReactNode
}) {
  return <Contexto value={{ vehiculos, recortado }}>{children}</Contexto>
}

export function useVehiculosDeLasNotas(): readonly VehiculoDeNota[] {
  return useContext(Contexto).vehiculos
}

export function useVehiculosRecortados(): boolean {
  return useContext(Contexto).recortado
}
