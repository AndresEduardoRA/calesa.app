// La API de servidor del área `catalogos` de `repuestos` (8.08-2): los cuatro catálogos para Configuración (8.08-3). Sale por el `index.ts` de la raíz.
export { leerCatalogosDeRepuestos } from '../../infra/catalogos/leer'
export {
  CATALOGOS_DE_REPUESTOS,
  TOPE_DE_VALORES_DE_CATALOGO,
  type CatalogosDeRepuestos,
  type ClaveDeCatalogo,
  type ValorDeCatalogo,
} from '../../entities/catalogos/catalogo'
