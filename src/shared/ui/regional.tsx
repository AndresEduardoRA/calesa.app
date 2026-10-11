'use client'

// Locale y moneda base de la empresa para los componentes que formatean (<Monto>). `shared` no
// conoce al módulo `empresa`: el layout de la app lee los ajustes y los pasa por acá.
import { createContext, use, useMemo, type ReactNode } from 'react'
import { LOCALE_POR_DEFECTO } from '@/shared/lib/formato'

export type Regional = { locale: string; monedaBase: string }

// Mismos valores por defecto que `ajustes_empresa`: un componente fuera del proveedor (un test,
// una pantalla de acceso) formatea igual que una empresa recién instalada.
const POR_DEFECTO: Regional = { locale: LOCALE_POR_DEFECTO, monedaBase: 'USD' }

const Contexto = createContext<Regional>(POR_DEFECTO)

export function ProveedorRegional({
  locale,
  monedaBase,
  children,
}: Regional & { children: ReactNode }) {
  const valor = useMemo(() => ({ locale, monedaBase }), [locale, monedaBase])
  return <Contexto value={valor}>{children}</Contexto>
}

export function useRegional(): Regional {
  return use(Contexto)
}
