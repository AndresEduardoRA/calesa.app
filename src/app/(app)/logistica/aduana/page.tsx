import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { puede, requerirSesion } from '@/modules/equipo'
import {
  esquemaDeFiltrosDeAduana,
  leerDeclaraciones,
  PANEL_EDITAR_DECLARACION,
  PANEL_NUEVA_DECLARACION,
  pedidoDeAduana,
} from '@/modules/logistica'
import {
  DrawerDeDeclaracion,
  DrawerDeLaDeclaracion,
  ListadoDeAduana,
} from '@/modules/logistica/pantallas/aduana'
import { datosO } from '@/shared/lib/errores'
import { CLAVE_DE_CURSOR, CLAVE_DE_PANEL, leerFiltros } from '@/shared/lib/filtros'
import { leerCursor } from '@/shared/lib/paginacion'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EsqueletoDetalle, EsqueletoListado } from '@/shared/ui/esqueletos'
import { CLAVE_DE_DECLARACION } from './clave-de-declaracion'
import { DeclaracionAbierta, DeclaracionEnEdicion } from './declaracion-abierta'

export const metadata: Metadata = { title: 'Aduana' }

// Las declaraciones aduaneras que quien mira puede ver (`docs/UX.md` › «Logística»): una página por cursor `(creado_en, id)` con sus filtros en la URL (`canal`, `pagada`, `q`). Lo que se
// ve lo decide la base (`declaraciones_listar()` es invocadora y sale vacía o con `42501` sin la clave); acá sólo se arma el pedido y se dibuja. La fila abre el resumen
// (`?declaracion=`). Ningún total exacto: lo que se muestra es la fila.
export default function PaginaDeAduana({ searchParams }: PageProps<'/logistica/aduana'>) {
  return (
    <>
      {/* El h1 va fuera del Suspense: está también cargando y sin permiso (9.12-5, R3). Sin cabecera visible: la ocupa la barra de filtros. */}
      <h1 className="sr-only">Aduana</h1>
      <Suspense fallback={<EsqueletoListado filas={8} columnas={6} />}>
        <Listado searchParams={searchParams} />
      </Suspense>
    </>
  )
}

async function Listado({
  searchParams,
}: {
  searchParams: PageProps<'/logistica/aduana'>['searchParams']
}) {
  await connection()
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  if (!puede(sesion.permisos, 'logistica.ver')) {
    return <EstadoSinPermiso />
  }
  const esquema = esquemaDeFiltrosDeAduana()
  const pedido = pedidoDeAduana(leerFiltros(esquema, parametros), {
    cursor: leerCursor(unParametro(parametros[CLAVE_DE_CURSOR])),
  })
  const pagina = datosO(await leerDeclaraciones(pedido))
  const declaracion = unParametro(parametros[CLAVE_DE_DECLARACION])
  const panel = unParametro(parametros[CLAVE_DE_PANEL])
  const puedeGestionar = puede(sesion.permisos, 'logistica.aduana.gestionar')
  // El formulario y el resumen no conviven (D8): el panel de alta o de edición, si hay permiso, tapa al resumen.
  const nueva = puedeGestionar && panel === PANEL_NUEVA_DECLARACION
  const editar = puedeGestionar && panel === PANEL_EDITAR_DECLARACION
  return (
    <>
      <ListadoDeAduana
        pagina={pagina}
        esquema={esquema}
        claveDeDeclaracion={CLAVE_DE_DECLARACION}
        puedeGestionar={puedeGestionar}
      />
      {nueva ? <DrawerDeDeclaracion original={null} /> : null}
      {!nueva && declaracion && editar ? (
        <Suspense
          key={`editar-${declaracion}`}
          fallback={
            <DrawerDeLaDeclaracion clave={CLAVE_DE_DECLARACION}>
              <EsqueletoDetalle />
            </DrawerDeLaDeclaracion>
          }
        >
          <DeclaracionEnEdicion id={declaracion} />
        </Suspense>
      ) : null}
      {!nueva && declaracion && !editar ? (
        <DrawerDeLaDeclaracion clave={CLAVE_DE_DECLARACION}>
          <Suspense key={declaracion} fallback={<EsqueletoDetalle />}>
            <DeclaracionAbierta id={declaracion} puedeGestionar={puedeGestionar} />
          </Suspense>
        </DrawerDeLaDeclaracion>
      ) : null}
    </>
  )
}
