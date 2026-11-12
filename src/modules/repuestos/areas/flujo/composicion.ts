// Composición de el área `flujo` de `repuestos` en el servidor (8.13-3): une la Cadena de repuestos y las esperas del vehículo con su interfaz. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDelFlujo } from '../../entities/flujo/repositorio'
import { leerCadenaDeRepuestos, leerColumnaDeRepuestos } from '../../infra/flujo/cadena'
import { esperasQueDestraban } from '../../infra/flujo/esperas'

// Leer la Cadena, lo que sigue de una columna y las esperas de un vehículo. Las actions de `features/flujo/` lo usan.
export const repositorioDelFlujo: RepositorioDelFlujo = {
  cadena: leerCadenaDeRepuestos,
  columna: leerColumnaDeRepuestos,
  esperas: esperasQueDestraban,
}
