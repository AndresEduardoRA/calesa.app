import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { puede, requerirSesion } from '@/modules/equipo'
import {
  CLAVE_DE_ORIGEN_DE_LA_CADENA,
  dondeEsta,
  esquemaDeFiltrosDeLaCadena,
  leerCadena,
  leerNavieras,
  leerOrigenesDeLaCadena,
  origenElegido,
  pedidoDeLaCadena,
} from '@/modules/logistica'
import {
  CadenaDeLogistica,
  EsqueletoDeTablero,
  EstadoDeLaCadena,
  PestanasDeOrigen,
} from '@/modules/logistica/pantallas/cadena'
import { BarraDelLote, ProveedorDeLaSeleccion } from '@/modules/logistica/pantallas/mover'
import { leerFiltros } from '@/shared/lib/filtros'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EsqueletoDetalle } from '@/shared/ui/esqueletos'
import { CLAVE_DE_UNIDAD } from './clave-de-unidad'
import { DrawerDeLaUnidad } from './drawer-de-la-unidad'
import { UnidadAbierta } from './unidad-abierta'

export const metadata: Metadata = { title: 'Logística' }

// `/logistica` (6.03): la cadena, un kanban por fase del origen elegido (`?origen=`), con los filtros en la URL y, si se busca, «dónde está» en todos los orígenes de la persona. Entra quien
// tiene `logistica.ver` en algún origen. Lo que se ve de cada origen lo decide la base (`logistica_cadena()`); aquí se arma el pedido y se dibuja. Abrir una tarjeta pone `?vehiculo=<id>` y el
// panel de la unidad (6.01) se dibuja en un drawer por URL: un id que no es válido o que ya no se ve muestra, dentro del drawer, el mismo «ya no está disponible» de su propia página.
export default function PaginaDeLogistica({ searchParams }: PageProps<'/logistica'>) {
  return (
    <Suspense fallback={<EsqueletoDeTablero />}>
      <Cadena searchParams={searchParams} />
    </Suspense>
  )
}

async function Cadena({ searchParams }: { searchParams: PageProps<'/logistica'>['searchParams'] }) {
  await connection()
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  const { permisos } = sesion
  if (!puede(permisos, 'logistica.ver')) {
    return <EstadoSinPermiso />
  }
  const unidad = unParametro(parametros[CLAVE_DE_UNIDAD])
  const panel = unidad ? (
    <DrawerDeLaUnidad>
      <Suspense key={unidad} fallback={<EsqueletoDetalle />}>
        <UnidadAbierta id={unidad} permisos={permisos} />
      </Suspense>
    </DrawerDeLaUnidad>
  ) : null

  const lista = await leerOrigenesDeLaCadena(permisos)
  if (lista === null) {
    return (
      <>
        <EstadoDeLaCadena tipo="error" />
        {panel}
      </>
    )
  }
  const origen = origenElegido(
    lista.origenes,
    unParametro(parametros[CLAVE_DE_ORIGEN_DE_LA_CADENA]),
  )
  if (origen === null) {
    return (
      <>
        <EstadoDeLaCadena tipo="sin_origenes" />
        {panel}
      </>
    )
  }

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <PestanasDeOrigen origenes={lista.origenes} actual={origen.id} />
      {lista.fallaron > 0 ? (
        <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
          {lista.fallaron === 1
            ? 'No se pudo comprobar 1 origen.'
            : `No se pudo comprobar ${String(lista.fallaron)} orígenes.`}
        </p>
      ) : null}
      <CadenaDelOrigen
        // Otro origen es otra pantalla: nada del estado de la anterior se arrastra.
        key={origen.id}
        origenId={origen.id}
        parametros={parametros}
        puedeConfigurarFlujos={puede(permisos, 'flujos.configurar')}
        // Las casillas y la barra del lote sólo salen con `flujos.mover` en el origen; la base vuelve a decidir al mover.
        puedeMover={
          puede(permisos, 'flujos.mover', origen.id) ||
          puede(permisos, 'flujos.mover.cualquiera', origen.id)
        }
      />
      {panel}
    </div>
  )
}

// La cadena de un origen con sus filtros y, si se busca, «dónde está». Si no se pueden leer las navieras sólo falta ese filtro; si falla la cadena, el error con «Reintentar».
async function CadenaDelOrigen({
  origenId,
  parametros,
  puedeConfigurarFlujos,
  puedeMover,
}: {
  origenId: string
  parametros: Record<string, string | string[] | undefined>
  puedeConfigurarFlujos: boolean
  puedeMover: boolean
}) {
  const ahora = new Date().toISOString()
  const navieras = await leerNavieras()
  const esquema = esquemaDeFiltrosDeLaCadena({ navieras: navieras.ok ? navieras.data : [] })
  const filtros = pedidoDeLaCadena(leerFiltros(esquema, parametros))
  const q = filtros.q
  const [cadena, donde] = await Promise.all([
    leerCadena(origenId, filtros),
    q === undefined ? Promise.resolve(null) : dondeEsta(q),
  ])
  if (!cadena.ok) {
    return <EstadoDeLaCadena tipo="error" />
  }
  const tablero = (
    <CadenaDeLogistica
      cadena={cadena.data}
      origenId={origenId}
      filtros={filtros}
      esquema={esquema}
      donde={
        q === undefined || donde === null ? null : { q, resultado: donde.ok ? donde.data : null }
      }
      ahora={ahora}
      claveDeUnidad={CLAVE_DE_UNIDAD}
      enlaceAFlujos={puedeConfigurarFlujos}
    />
  )
  if (!puedeMover) return tablero
  return (
    <ProveedorDeLaSeleccion origenId={origenId} firmaDelPedido={JSON.stringify(filtros)}>
      {tablero}
      <BarraDelLote />
    </ProveedorDeLaSeleccion>
  )
}
