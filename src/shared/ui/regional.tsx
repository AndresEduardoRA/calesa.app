'use client'

// Locale, moneda base y zona horaria de la empresa para los componentes que formatean (<Monto>,
// las fechas). `shared` no conoce al módulo `empresa`: el layout de la app lee los ajustes y los
// pasa por acá.
import { createContext, use, useMemo, type ReactNode } from 'react'
import { ZONA_POR_DEFECTO } from '@/shared/lib/fechas'
import { LOCALE_POR_DEFECTO } from '@/shared/lib/formato'

export type Regional = { locale: string; monedaBase: string; zonaHoraria: string }

// Mismos valores por defecto que `ajustes_empresa`: un componente fuera del proveedor (un test,
// una pantalla de acceso) formatea igual que una empresa recién instalada.
const POR_DEFECTO: Regional = {
  locale: LOCALE_POR_DEFECTO,
  monedaBase: 'USD',
  zonaHoraria: ZONA_POR_DEFECTO,
}

const Contexto = createContext<Regional>(POR_DEFECTO)

export function ProveedorRegional({
  locale,
  monedaBase,
  zonaHoraria,
  children,
}: Regional & { children: ReactNode }) {
  const valor = useMemo(
    () => ({ locale, monedaBase, zonaHoraria }),
    [locale, monedaBase, zonaHoraria],
  )
  return <Contexto value={valor}>{children}</Contexto>
}

export function useRegional(): Regional {
  return use(Contexto)
}
