'use client'

// Locale, moneda base y zona horaria de la empresa para los componentes que formatean (<Monto>,
// las fechas). `shared` no conoce al módulo `empresa`: el layout de la app lee los ajustes y los
// pasa por acá.
import { createContext, use, useMemo, type ReactNode } from 'react'
import { ZONA_POR_DEFECTO } from '@/shared/lib/fechas'
import { LOCALE_POR_DEFECTO } from '@/shared/lib/formato'

// `zonaHoraria` es la de la empresa (todo lo que se fecha); `zonaDeLaPersona`, la que eligió quien mira en `/perfil` (o la de la empresa): la
// usan las fechas que se leen en otra zona, como la de una subasta.
export type Regional = {
  locale: string
  monedaBase: string
  zonaHoraria: string
  zonaDeLaPersona: string
}

// Mismos valores por defecto que `ajustes_empresa`: un componente fuera del proveedor (un test,
// una pantalla de acceso) formatea igual que una empresa recién instalada.
const POR_DEFECTO: Regional = {
  locale: LOCALE_POR_DEFECTO,
  monedaBase: 'USD',
  zonaHoraria: ZONA_POR_DEFECTO,
  zonaDeLaPersona: ZONA_POR_DEFECTO,
}

const Contexto = createContext<Regional>(POR_DEFECTO)

export function ProveedorRegional({
  locale,
  monedaBase,
  zonaHoraria,
  zonaDeLaPersona,
  children,
}: Omit<Regional, 'zonaDeLaPersona'> & { zonaDeLaPersona?: string | null; children: ReactNode }) {
  const valor = useMemo(
    () => ({ locale, monedaBase, zonaHoraria, zonaDeLaPersona: zonaDeLaPersona ?? zonaHoraria }),
    [locale, monedaBase, zonaHoraria, zonaDeLaPersona],
  )
  return <Contexto value={valor}>{children}</Contexto>
}

export function useRegional(): Regional {
  return use(Contexto)
}
