// Composición de el área `transporte` de `logistica` en el servidor (6.01, llenada en 6.08): une las escrituras de los catálogos con su interfaz. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeCatalogosDeTransporte } from '../../entities/transporte/repositorio-de-catalogos'
import type { RepositorioDeTransporte } from '../../entities/transporte/repositorio-de-transporte'
import { catalogosDeTransporteSupabase } from '../../infra/transporte/catalogos'
import { transporteSupabase } from '../../infra/transporte/guardar'

// Crear y corregir un puerto o una naviera (6.08-1). Las actions de `features/transporte/` lo usan.
export const repositorioDeCatalogosDeTransporte: RepositorioDeCatalogosDeTransporte =
  catalogosDeTransporteSupabase

// Guardar el transporte de una unidad, con versión (6.08-2). La action de `features/transporte/` lo usa.
export const repositorioDeTransporte: RepositorioDeTransporte = transporteSupabase
