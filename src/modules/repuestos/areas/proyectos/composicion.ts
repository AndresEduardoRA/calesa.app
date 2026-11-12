// Composición del área `proyectos` de `repuestos` en el servidor (8.09-1): une leer y crear proyectos con su interfaz. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeProyectos } from '../../entities/proyectos/repositorio'
import { proyectosSupabase } from '../../infra/proyectos/crear'

// Leer el listado y crear un proyecto. La página y las actions de `features/proyectos/` lo usan.
export const repositorioDeProyectos: RepositorioDeProyectos = proyectosSupabase
