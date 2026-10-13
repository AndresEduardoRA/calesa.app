import type { Metadata } from 'next'
import { getAjustes } from '@/modules/empresa'
import { leerVistas, puede, requerirSesion } from '@/modules/equipo'
import { leerFasesDeOrigen } from '@/modules/flujos'
import { getOrigenes, leerLayout } from '@/modules/origenes'
import {
  ListadoDeVehiculos,
  buscarVehiculos,
  condicionesDe,
  esquemaDeFiltros,
  origenElegido,
  origenesVisibles,
} from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'
import { CLAVE_DE_CURSOR, leerFiltros } from '@/shared/lib/filtros'
import { leerCursor } from '@/shared/lib/paginacion'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'

export const metadata: Metadata = { title: 'Vehículos' }

// Filas por página: lo que entra en una pantalla y media con la densidad compacta.
const TAMANO_DE_PAGINA = 50

// El inventario, una pestaña por origen. Las pestañas son los orígenes donde la persona tiene
// `vehiculos.ver` (también los desactivados); lo que ve adentro lo decide la RLS. El origen, los
// filtros y la página vienen en la URL, y lo que no corresponde se ignora.
export default async function PaginaVehiculos({ searchParams }: PageProps<'/vehiculos'>) {
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  const visibles = origenesVisibles(sesion.permisos, datosO(await getOrigenes(true)))
  const origen = origenElegido(visibles, unParametro(parametros['origen']))
  if (!origen) {
    return (
      <EstadoSinPermiso descripcion="No tienes permiso para ver vehículos en ningún origen. Pídeselo a quien administra los roles." />
    )
  }

  const [layout, fases, vistas, ajustes] = await Promise.all([
    leerLayout(origen.id, { conUso: false }),
    leerFasesDeOrigen(origen.id),
    leerVistas('vehiculos'),
    getAjustes(),
  ])
  const { campos, categorias } = datosO(layout)
  const fuentes = { campos, categorias, fases: datosO(fases) }
  const esquema = esquemaDeFiltros(fuentes)
  const pagina = await buscarVehiculos({
    origenId: origen.id,
    condiciones: condicionesDe(campos, leerFiltros(esquema, parametros), {
      zona: ajustes.zonaHoraria,
    }),
    cursor: leerCursor(unParametro(parametros[CLAVE_DE_CURSOR])),
    tamano: TAMANO_DE_PAGINA,
  })
  const idsVisibles = new Set(visibles.map((uno) => uno.id))

  return (
    <ListadoDeVehiculos
      origenes={visibles}
      origen={origen}
      {...fuentes}
      esquema={esquema}
      pagina={datosO(pagina)}
      // Una vista de un origen que la persona ya no ve no se ofrece.
      vistas={datosO(vistas).filter((vista) => idsVisibles.has(vista.params['origen'] ?? ''))}
      puedeConfigurarCampos={puede(sesion.permisos, 'origenes.gestionar')}
    />
  )
}
