import { leerCursorDeStock, leerStock } from '@/modules/repuestos'
import { VistaDeStock } from '@/modules/repuestos/pantallas/stock-vista'
import { datosO } from '@/shared/lib/errores'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { unParametro } from '@/shared/lib/rutas'

type Props = { parametros: Record<string, string | string[] | undefined>; puedeEditar: boolean }

// La vista «Stock» de `/repuestos` (8.10-3, C7): una página por cursor con la sesión de quien mira (sin `repuestos.ver` la base no devuelve filas; la página ya cortó antes).
export async function ListadoDeStock({ parametros, puedeEditar }: Props) {
  const pagina = datosO(
    await leerStock(leerCursorDeStock(unParametro(parametros[CLAVE_DE_CURSOR]))),
  )
  return <VistaDeStock pagina={pagina} puedeEditar={puedeEditar} />
}
