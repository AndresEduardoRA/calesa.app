// Composición del módulo en el servidor: acá se decide qué implementación recibe cada interfaz de
// `entities/repositorios`. Los casos de uso de `features/` importan de este archivo, nunca de `infra/`.
import 'server-only'
import type { RepositorioDeVisitas } from './entities/repositorios'
import { visitasSupabase } from './infra/visitas'

export const repositorioDeVisitas: RepositorioDeVisitas = visitasSupabase
