// Composición del área `diseno` de `cotizaciones` en el servidor: la pestaña «Diseño» de Configuración › Cotización (4.22-2). Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeTonos } from '../../entities/diseno/respuesta-de-tonos'
import type { RepositorioDelDiseno } from '../../entities/diseno/edicion-del-diseno'
import { repositorioDelDisenoSupabase } from '../../infra/diseno/guardado'
import { repositorioDeTonosSupabase } from '../../infra/diseno/escritura'
import {
  leerDisenoDelOrigen,
  leerNivelesDelDiseno,
  leerTonosDelCatalogo,
} from '../../infra/diseno/lectura'

// El borrador (o, sin él, la publicada) de un origen, y los niveles que su diseño puede nombrar.
export { leerDisenoDelOrigen, leerNivelesDelDiseno, leerTonosDelCatalogo }

// Guardar el borrador del diseño (4.22-2).
export const repositorioDelDiseno: RepositorioDelDiseno = repositorioDelDisenoSupabase

// Crear, guardar y eliminar un tono del catálogo (4.22-4).
export const repositorioDeTonos: RepositorioDeTonos = repositorioDeTonosSupabase
