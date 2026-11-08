import { datosO } from '@/shared/lib/errores'
import { leerTonosDelCatalogo } from '../../../areas/diseno/composicion'
import { TonosDelCatalogoDiferido } from './diferidos'

// La pestaña «Tonos» de Configuración › Cotización (4.22-4), leída en el servidor con la sesión de quien mira y detrás de `<Suspense>`. La pestaña ya pide
// `cotizaciones.configurar` y la base lo vuelve a pedir al escribir (la lectura la puede cualquiera con sesión). Una lectura que falla sube al `error.tsx` de la ruta,
// que ofrece «Reintentar».
export async function SeccionDeLosTonos() {
  return <TonosDelCatalogoDiferido lista={datosO(await leerTonosDelCatalogo())} />
}
