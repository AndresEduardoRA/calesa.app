'use client'

import { useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { frasePorVacio } from '@/modules/origenes/client'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { ubicacionDeLaPagina, type Pagina } from '@/shared/lib/paginacion'
import { EstadoPaginaSinFilas, EstadoSinResultados, EstadoVacio } from '@/shared/ui/estados'
import { useFiltrosDelListado } from '@/shared/ui/filtros'
import { UnaSolaVista } from '@/shared/ui/lista'
import { Paginacion, UbicacionDeLaPagina } from '@/shared/ui/paginacion'
import { BarraDeSeleccion } from '../../papelera/components/barra-de-seleccion'
import { usePapeleraDelListado } from '../../papelera/hooks/use-papelera-del-listado'
import { TablaDeVehiculos } from './tabla-de-vehiculos'
import { TarjetasDeVehiculos } from './tarjetas-de-vehiculos'
import type { PermisoDeVitrina } from '../../../entities/vitrina'
import type { DatosDelOrigen, FilaDeVehiculo } from './tipos'

type Props = DatosDelOrigen & {
  pagina: Pagina<FilaDeVehiculo>
  // «Nuevo», si la persona puede dar de alta acá: llena el vacío de primera vez.
  accionDeVacio?: ReactNode
  // Los ids de la página que la persona puede editar.
  editables: readonly string[]
  // Y los que puede enviar a la papelera: son los que se pueden elegir.
  eliminables: readonly string[]
  // Si puede publicar en este origen: sin eso «Publicar en la web…» no está en el «⋯».
  publicar: PermisoDeVitrina
  // Abre el resumen de un vehículo, y cuál está abierto (para marcarlo).
  alAbrir: (id: string) => void
  abierto: string | null
}

const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)

// La lista de un origen o el estado que corresponda: vacío de primera vez (con la frase del
// origen), vacío por filtro (con «Limpiar») o una página que se quedó sin filas. Una sola vista (`<UnaSolaVista>`, como el listado de
// leads): la tabla desde `md` y las tarjetas por debajo.
export function ResultadoDelListado(props: Props) {
  const { pagina, accionDeVacio, editables, eliminables, publicar, alAbrir, abierto, ...datos } =
    props
  const filtros = useFiltrosDelListado()
  const hayCursor = useSearchParams().has(CLAVE_DE_CURSOR)
  const { origen } = datos
  const menu = { editables: new Set(editables), eliminables: new Set(eliminables), publicar }
  const papelera = usePapeleraDelListado(pagina.filas, eliminables)

  if (pagina.filas.length === 0) {
    if (filtros.hayFiltros) {
      return <EstadoSinResultados alLimpiar={filtros.limpiar} />
    }
    if (hayCursor) {
      return <EstadoPaginaSinFilas />
    }
    return (
      <EstadoVacio
        titulo={mayuscula(frasePorVacio(origen))}
        descripcion={
          origen.activo
            ? 'Lo que se dé de alta en este origen va a aparecer acá.'
            : 'Este origen está desactivado: no recibe registros nuevos.'
        }
        accion={accionDeVacio}
      />
    )
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <UbicacionDeLaPagina ubicacion={ubicacionDeLaPagina(pagina)} />
      <UnaSolaVista
        tabla={() => (
          <TablaDeVehiculos
            {...datos}
            vehiculos={pagina.filas}
            encabezado={mayuscula(origen.sustantivo)}
            menu={menu}
            seleccion={papelera.seleccion}
            alAbrir={alAbrir}
            abierto={abierto}
          />
        )}
        tarjetas={() => (
          <TarjetasDeVehiculos
            {...datos}
            vehiculos={pagina.filas}
            menu={menu}
            seleccion={papelera.seleccion}
            alAbrir={alAbrir}
            abierto={abierto}
          />
        )}
      />
      <Paginacion siguiente={pagina.siguiente} anterior={pagina.anterior} />
      {papelera.cantidad > 0 ? (
        <BarraDeSeleccion
          origen={origen}
          cantidad={papelera.cantidad}
          enCurso={papelera.enCurso}
          alEnviar={() => {
            void papelera.enviar()
          }}
          alLimpiar={papelera.limpiar}
        />
      ) : null}
    </div>
  )
}
