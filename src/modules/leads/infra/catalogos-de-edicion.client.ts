// Lo que el panel de edición de la ficha necesita y la ficha no manda: el layout de campos y los orígenes y tipos de lead (también los
// apagados: el lead que conserva uno lo sigue nombrando y el panel lo ofrece marcado). Se leen en el navegador, con la sesión de quien mira,
// cuando el panel se abre: hasta 100 orígenes, 100 tipos y todos los campos del layout viajaban con el documento de la ficha en
// cada visita, la use o no (`docs/RENDIMIENTO.md` › «Cierre 5b»). Es lo mismo que lee el servidor (`leads_campos` y `leads_catalogos()`):
// la RLS de las dos tablas la lee toda sesión y qué recibe de cada lead lo decide la base.
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { camposDeLeadDesde, type CampoDeLead } from '../entities/campo'
import { catalogosDeLeadDesde, type CatalogosDeLead } from '../entities/catalogos'

export type CatalogosDeEdicion = CatalogosDeLead & { campos: CampoDeLead[] }

export async function leerCatalogosDeEdicion(): Promise<Resultado<CatalogosDeEdicion>> {
  const supabase = createClient()
  const [campos, catalogos] = await Promise.all([
    supabase.from('leads_campos').select('*'),
    supabase.rpc('leads_catalogos'),
  ])
  if (campos.error) {
    return { ok: false, error: errorDePostgrest(campos.error) }
  }
  if (catalogos.error) {
    return { ok: false, error: errorDePostgrest(catalogos.error) }
  }
  const desde = catalogosDeLeadDesde(catalogos.data)
  return desde
    ? ok({ campos: camposDeLeadDesde(campos.data), ...desde })
    : fallo(
        'inesperado',
        'No pudimos leer los orígenes y los tipos de lead. Recarga e intenta de nuevo.',
      )
}
