// Composición del área `diseno` de `cotizaciones` en el servidor: la pestaña «Diseño» de Configuración › Cotización (4.22-2). Sale por la `composicion.ts` de la raíz.
import 'server-only'
import { leerDisenoDelOrigen, leerNivelesDelDiseno } from '../../infra/diseno/lectura'

// El borrador (o, sin él, la publicada) de un origen, y los niveles que su diseño puede nombrar.
export { leerDisenoDelOrigen, leerNivelesDelDiseno }
