// Composición del área `diseno` de `cotizaciones` en el servidor: la pestaña «Diseño» de Configuración › Cotización (4.22-2). Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDelDiseno } from '../../entities/diseno/edicion-del-diseno'
import { repositorioDelDisenoSupabase } from '../../infra/diseno/guardado'
import { leerDisenoDelOrigen, leerNivelesDelDiseno } from '../../infra/diseno/lectura'

// El borrador (o, sin él, la publicada) de un origen, y los niveles que su diseño puede nombrar.
export { leerDisenoDelOrigen, leerNivelesDelDiseno }

// Guardar el borrador del diseño (4.22-2).
export const repositorioDelDiseno: RepositorioDelDiseno = repositorioDelDisenoSupabase
