// Composición del módulo en el servidor: acá se decide qué implementación recibe cada interfaz
// de `entities/repositorios`. Los casos de uso de `features/` importan de este archivo, nunca de
// `infra/` (lo verifica eslint-plugin-boundaries).
import 'server-only'
import type {
  LectorDeDatosNuevos,
  LectorDeLayout,
  LectorDeOrigenes,
  RepositorioCampos,
  RepositorioCategorias,
  RepositorioOrigenes,
} from './entities/repositorios'
import { camposSupabase } from './infra/campos'
import { categoriasSupabase } from './infra/categorias'
import { origenesSupabase } from './infra/origenes'
import { getDatosNuevos } from './infra/queries/datos-nuevos'
import { getLayout } from './infra/queries/layout'
import { getOrigenes, getOrigenesConUso } from './infra/queries/origenes'

export const repositorioOrigenes: RepositorioOrigenes = origenesSupabase
export const repositorioCampos: RepositorioCampos = camposSupabase
export const repositorioCategorias: RepositorioCategorias = categoriasSupabase

export const leerOrigenes: LectorDeOrigenes = getOrigenesConUso
export const leerLayout: LectorDeLayout = getLayout
export const leerDatosNuevosDeApibara: LectorDeDatosNuevos = getDatosNuevos

export { getOrigenes }
