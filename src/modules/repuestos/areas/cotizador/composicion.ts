// Composición del área `cotizador` de `repuestos` en el servidor (8.12-2): une la escritura de la configuración con su interfaz. Sale por la
// `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeConfiguracion } from '../../entities/cotizador/repositorio'
import { configuracionSupabase } from '../../infra/cotizador/escribir-configuracion'

// Publicar la fórmula y guardar tramos y cajas. Las actions de `features/cotizador/` lo usan.
export const repositorioDeConfiguracion: RepositorioDeConfiguracion = configuracionSupabase
