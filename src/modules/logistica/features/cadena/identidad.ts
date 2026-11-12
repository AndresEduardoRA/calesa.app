import 'server-only'
import { getAjustes } from '@/modules/empresa'
import { leerCampoPrincipal } from '@/modules/origenes'
import { identidadDeVehiculo, identidadEnUnaLinea } from '@/modules/vehiculos'
import type { TarjetaDeLaCadena } from '../../entities/cadena/leer'
import type { LectorDeAtributos } from '../../entities/cadena/repositorios'

// Las tarjetas nombradas por el campo principal de su origen, «<principal> · <título>» (6.13), con el formato de la empresa. Los atributos se leen sólo si el origen tiene campo
// principal y bajo la RLS de quien mira. Si algo falla (el principal, los ajustes, una tanda de atributos) o a una tarjeta no le llegan atributos, queda el título: no tumba el tablero.
export async function nombrarLasTarjetas(
  origenId: string,
  tarjetas: readonly TarjetaDeLaCadena[],
  leerAtributos: LectorDeAtributos,
): Promise<TarjetaDeLaCadena[]> {
  if (tarjetas.length === 0) return []
  const principal = await leerCampoPrincipal(origenId)
  if (!principal.ok || principal.data === null) return [...tarjetas]
  const [atributos, ajustes] = await Promise.all([
    leerAtributos(tarjetas.map((t) => t.id)),
    getAjustes(),
  ])
  if (!atributos.ok) return [...tarjetas]
  const campo = principal.data
  return tarjetas.map((tarjeta) => {
    const deLaTarjeta = atributos.data.get(tarjeta.id)
    if (deLaTarjeta === undefined) return tarjeta
    const identidad = identidadDeVehiculo(
      { titulo: tarjeta.titulo, atributos: deLaTarjeta },
      campo,
      {
        locale: ajustes.locale,
        zona: ajustes.zonaHoraria,
      },
    )
    return { ...tarjeta, nombre: identidadEnUnaLinea(identidad) }
  })
}
