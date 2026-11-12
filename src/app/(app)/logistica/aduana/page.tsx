import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { puede, requerirSesion } from '@/modules/equipo'
import { esquemaDeFiltrosDeAduana, leerDeclaraciones, pedidoDeAduana } from '@/modules/logistica'
import { DrawerDeLaDeclaracion, ListadoDeAduana } from '@/modules/logistica/pantallas/aduana'
import { datosO } from '@/shared/lib/errores'
import { CLAVE_DE_CURSOR, leerFiltros } from '@/shared/lib/filtros'
import { leerCursor } from '@/shared/lib/paginacion'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EsqueletoDetalle, EsqueletoListado } from '@/shared/ui/esqueletos'
import { CLAVE_DE_DECLARACION } from './clave-de-declaracion'
import { DeclaracionAbierta } from './declaracion-abierta'

export const metadata: Metadata = { title: 'Aduana' }

// Las declaraciones aduaneras que quien mira puede ver (`docs/UX.md` › «Logística»): una página por cursor `(creado_en, id)` con sus filtros en la URL (`canal`, `pagada`, `q`). Lo que se
// ve lo decide la base (`declaraciones_listar()` es invocadora y sale vacía o con `42501` sin la clave); acá sólo se arma el pedido y se dibuja. La fila abre el resumen
// (`?declaracion=`). Ningún total exacto: lo que se muestra es la fila.
export default function PaginaDeAduana({ searchParams }: PageProps<'/logistica/aduana'>) {
  return (
    <Suspense fallback={<EsqueletoListado filas={8} columnas={6} />}>
      <Listado searchParams={searchParams} />
    </Suspense>
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
  return (
    <>
      <ListadoDeAduana
        pagina={pagina}
        esquema={esquema}
        claveDeDeclaracion={CLAVE_DE_DECLARACION}
      />
      {declaracion ? (
        <DrawerDeLaDeclaracion clave={CLAVE_DE_DECLARACION}>
          <Suspense key={declaracion} fallback={<EsqueletoDetalle />}>
            <DeclaracionAbierta id={declaracion} />
          </Suspense>
        </DrawerDeLaDeclaracion>
      ) : null}
    </>
  )
}
