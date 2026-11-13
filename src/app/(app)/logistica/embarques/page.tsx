import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { puede, requerirSesion } from '@/modules/equipo'
import {
  claveDelResumenDe,
  CLAVE_DE_GRUPO,
  esquemaDeFiltrosDeGrupos,
  leerCatalogosDeTransporte,
  leerGrupos,
  PANEL_EDITAR_GRUPO,
  pedidoDeGrupos,
  vistaDeGrupos,
} from '@/modules/logistica'
import { DrawerDelGrupo, ListadoDeEmbarques } from '@/modules/logistica/pantallas/transporte'
import { datosO } from '@/shared/lib/errores'
import { CLAVE_DE_CURSOR, CLAVE_DE_PANEL, leerFiltros } from '@/shared/lib/filtros'
import { RUTAS, unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EsqueletoDetalle, EsqueletoListado } from '@/shared/ui/esqueletos'
import { GrupoAbierto } from './grupo-abierto'
import { GrupoEnEdicion } from './grupo-en-edicion'
import { puedeEditarTransporte } from './huecos-del-grupo'

export const metadata: Metadata = { title: 'Embarques' }

// Los embarques (por booking) y los contenedores que quien mira puede ver (`docs/UX.md` › «Logística»): una página por cursor opaco, con sus filtros en la URL (`naviera`, `puerto_origen`,
// `puerto_destino`, `en_transito`, `q`). Lo que se ve lo decide la base (`transporte_grupos()` cuenta sólo las unidades visibles); acá sólo se arma el pedido y se dibuja. La fila abre el
// resumen (`?booking=` o `?contenedor=`). Ningún total exacto: lo que se muestra es la fila.
export default function PaginaDeEmbarques({ searchParams }: PageProps<'/logistica/embarques'>) {
  return (
    <>
      {/* El h1 va fuera del Suspense: está también cargando y sin permiso (9.12-5, R3). Sin cabecera visible: la ocupa la barra de filtros. */}
      <h1 className="sr-only">Embarques</h1>
      <Suspense fallback={<EsqueletoListado filas={8} columnas={7} />}>
        <Listado searchParams={searchParams} />
      </Suspense>
    </>
  )
}

async function Listado({
  searchParams,
}: {
  searchParams: PageProps<'/logistica/embarques'>['searchParams']
}) {
  await connection()
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  if (!puede(sesion.permisos, 'logistica.ver')) {
    return <EstadoSinPermiso />
  }
  const vista = vistaDeGrupos(unParametro(parametros[CLAVE_DE_GRUPO]))
  const catalogos = datosO(await leerCatalogosDeTransporte())
  const esquema = esquemaDeFiltrosDeGrupos(vista, catalogos)
  const pedido = pedidoDeGrupos(leerFiltros(esquema, parametros), {
    vista,
    desde: unParametro(parametros[CLAVE_DE_CURSOR]) ?? null,
  })
  const pagina = datosO(await leerGrupos(pedido))
  const clave = claveDelResumenDe(vista)
  const abierto = unParametro(parametros[clave])
  // El formulario de «Editar grupo» tapa al resumen (D36); sin permiso, `?panel=editar-grupo` se ignora (D37).
  const editando =
    unParametro(parametros[CLAVE_DE_PANEL]) === PANEL_EDITAR_GRUPO &&
    puedeEditarTransporte(sesion.permisos)
  return (
    <>
      <ListadoDeEmbarques
        pagina={pagina}
        vista={vista}
        esquema={esquema}
        catalogos={{
          navieras: catalogos.navieras.map((n) => ({ id: n.id, nombre: n.nombre })),
          puertos: catalogos.puertos.map((p) => ({ id: p.id, nombre: p.nombre })),
        }}
        ruta={RUTAS.embarques}
        claveDelResumen={clave}
      />
      {abierto && editando ? (
        <Suspense key={`editar-${vista}-${abierto}`} fallback={<EsqueletoDetalle />}>
          <GrupoEnEdicion clave={abierto} vista={vista} claveDeUrl={clave} />
        </Suspense>
      ) : abierto ? (
        <DrawerDelGrupo clave={clave} vista={vista}>
          <Suspense key={`${vista}-${abierto}`} fallback={<EsqueletoDetalle />}>
            <GrupoAbierto
              clave={abierto}
              vista={vista}
              permisos={sesion.permisos}
              claveDeUrl={clave}
            />
          </Suspense>
        </DrawerDelGrupo>
      ) : null}
    </>
  )
}
