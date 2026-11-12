// Composición de el área `dinero` de `logistica` en el servidor (6.01, llenada en 6.11): une las escrituras de gastos con su interfaz. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeGastos } from '../../entities/dinero/repositorio-de-gastos'
import { gastosSupabase } from '../../infra/dinero/gastos'

// Registrar, corregir y eliminar un gasto (6.11-1). Las actions de `features/dinero/` lo usan.
export const repositorioDeGastos: RepositorioDeGastos = gastosSupabase
