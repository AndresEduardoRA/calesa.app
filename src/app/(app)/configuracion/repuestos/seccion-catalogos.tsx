import { leerCatalogosDeRepuestos } from '@/modules/repuestos'
import { CatalogosDeRepuestos } from '@/modules/repuestos/pantallas/catalogos'
import { datosO } from '@/shared/lib/errores'

// La pestaña «Catálogos»: los cuatro, también los desactivados, con tope de 200 valores por catálogo. Si la lectura falla, `error.tsx` lo dice con «Reintentar».
export async function SeccionCatalogos() {
  return <CatalogosDeRepuestos catalogos={datosO(await leerCatalogosDeRepuestos())} />
}
