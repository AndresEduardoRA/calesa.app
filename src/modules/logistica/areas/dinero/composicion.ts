// Composición de el área `dinero` de `logistica` en el servidor (6.01, llenada en 6.11): une las escrituras de gastos y de pagos con su interfaz. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeGastos } from '../../entities/dinero/repositorio-de-gastos'
import type { RepositorioDePagos } from '../../entities/dinero/repositorio-de-pagos'
import { gastosSupabase } from '../../infra/dinero/gastos'
import { pagosSupabase } from '../../infra/dinero/pagos'

// Registrar, corregir y eliminar un gasto (6.11-1). Las actions de `features/dinero/` lo usan.
export const repositorioDeGastos: RepositorioDeGastos = gastosSupabase

// Registrar, corregir, eliminar, confirmar y anular un pago (6.11-2).
export const repositorioDePagos: RepositorioDePagos = pagosSupabase
