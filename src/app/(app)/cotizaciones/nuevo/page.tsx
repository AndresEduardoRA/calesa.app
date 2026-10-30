import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { z } from 'zod'
import {
  aperturaDe,
  contarCotizacionesDelVehiculo,
  CLAVE_DE_LEAD,
  CLAVE_DE_ORIGEN,
  CLAVE_DE_VEHICULO,
  leerHojaParaCotizar,
  modoInicial,
  origenElegido,
  origenesParaCotizar,
  recalcularAlAbrir,
} from '@/modules/cotizaciones'
import {
  EsqueletoDeHoja,
  FormulaSinPublicar,
  HistorialDelVehiculo,
  PantallaDeCotizar,
  PestanasDeOrigen,
} from '@/modules/cotizaciones/pantallas/cotizar'
import { requerirSesion } from '@/modules/equipo'
import { getOrigenes } from '@/modules/origenes'
import { elegidoDesde, leerVehiculo } from '@/modules/vehiculos'
import { BarraDelVehiculo } from '@/modules/vehiculos/pantallas/cotizar'
import { conteoCorto } from '@/shared/lib/conteo'
import { datosO } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'

export const metadata: Metadata = { title: 'Cotizar' }

// La hoja de cotizar (`docs/UX.md` › «Cotizar»): una pestaña por origen donde la persona cotiza y, de cada uno, la hoja que dibuja su fórmula publicada. `?origen=`
// elige el origen; `?lead=` y `?vehiculo=` llegan de la ficha del lead o del vehículo, o el vehículo se elige en la barra de arriba de la hoja (su panel, `?panel=vehiculo`,
// 4.14-2a): se validan y se llevan. Sin entrada en la navegación todavía: se llega por URL. Guarda con el lead de la URL (4.13-3b); sin él, «Guardar» dice por qué no.
export default function PaginaDeCotizar({ searchParams }: PageProps<'/cotizaciones/nuevo'>) {
  return (
    <div className="grid min-w-0 gap-4">
      <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Cotizar</h1>
      <Suspense fallback={<EsqueletoDeHoja />}>
        <Hoja parametros={searchParams} />
      </Suspense>
    </div>
  )
}

const esId = z.guid()
// Lo que la URL trae como id y no lo es se ignora.
const idDeUrl = (valor: string | string[] | undefined): string | null => {
  const leido = esId.safeParse(unParametro(valor))
  return leido.success ? leido.data : null
}

// La hoja y, con la hoja abierta que ella entrega, el primer cálculo (4-28: el total es el de la versión y las tarifas que se dibujan): llega dibujada con sus valores y el
// navegador no pide nada al abrir. Un pedido más en serie, que se ahorra cuando no hay hoja que calcular (sin permiso, sin publicar).
async function abrirLaHoja(origenId: string, vehiculoId: string | null) {
  const hoja = await leerHojaParaCotizar(origenId)
  const alAbrir =
    hoja.ok && hoja.data.estado === 'lista'
      ? await recalcularAlAbrir({
          origenId,
          vehiculoId,
          abierta: hoja.data.abierta,
          modoTc: modoInicial(hoja.data.cabecera),
        })
      : null
  return {
    apertura: aperturaDe(hoja, alAbrir?.resultado ?? null),
    vehiculoSoltado: alAbrir?.vehiculoSoltado ?? false,
  }
}

// El vehículo de la URL como lo dibuja la barra; null si no vino, no existe o no se ve.
async function elegidoDeLaUrl(id: string | null) {
  if (id === null) {
    return null
  }
  const leido = await leerVehiculo(id)
  return leido.ok && leido.data ? elegidoDesde(leido.data) : null
}

// La barra del vehículo con su «Cotizado (n)» y su historial. Lo une esta página: `vehiculos` recibe el historial armado, sin importar `cotizaciones`. Sin elegido (soltado
// por la hoja, inexistente o que no se ve) no hay insignia ni historial; un conteo que falló es sólo una etiqueta menos. Plegado, el historial se lee al desplegarlo.
function BarraConHistorial({
  origen,
  elegido,
  conteo,
  puedeVer,
}: {
  origen: { id: string; tipo: string }
  elegido: Awaited<ReturnType<typeof elegidoDeLaUrl>>
  conteo: Awaited<ReturnType<typeof contarCotizacionesDelVehiculo>> | null
  puedeVer: boolean
}) {
  const cotizado = elegido && conteo?.ok ? conteo.data : null
  // El «n» de la insignia ya escrito («2», «20+»); con 0, sin insignia. La barra va en la carga en frío de la hoja y recibe el texto, no el conteo.
  const insignia = cotizado !== null && cotizado.n > 0 ? conteoCorto(cotizado) : null
  return (
    <BarraDelVehiculo
      origenId={origen.id}
      esSubasta={origen.tipo === 'subasta'}
      elegido={elegido}
      puedeVer={puedeVer}
      claveDeLaUrl={CLAVE_DE_VEHICULO}
      cotizado={insignia}
      historial={
        elegido ? (
          <HistorialDelVehiculo key={elegido.id} vehiculoId={elegido.id} conteo={cotizado} />
        ) : null
      }
    />
  )
}

async function Hoja({
  parametros,
}: {
  parametros: PageProps<'/cotizaciones/nuevo'>['searchParams']
}) {
  await connection()
  const [sesion, url] = await Promise.all([requerirSesion(), parametros])
  const origenes = origenesParaCotizar(sesion.permisos, datosO(await getOrigenes()))
  const origen = origenElegido(origenes, unParametro(url[CLAVE_DE_ORIGEN]))
  if (!origen) {
    return (
      <EstadoSinPermiso descripcion="No tienes permiso para cotizar en ningún origen. Pídeselo a quien administra los roles." />
    )
  }
  const lead = idDeUrl(url[CLAVE_DE_LEAD])
  const vehiculo = idDeUrl(url[CLAVE_DE_VEHICULO])
  // El vehículo de la barra y su «Cotizado (n)» se leen a la vez que la hoja; si la hoja lo suelta, la barra queda sin él.
  const [{ apertura, vehiculoSoltado }, elegido, conteo] = await Promise.all([
    abrirLaHoja(origen.id, vehiculo),
    elegidoDeLaUrl(vehiculo),
    vehiculo === null ? null : contarCotizacionesDelVehiculo(vehiculo),
  ])
  if (apertura.tipo === 'sin_permiso') {
    return (
      <EstadoSinPermiso descripcion="No tienes permiso para cotizar en este origen. Pídeselo a quien administra los roles." />
    )
  }
  if (apertura.tipo === 'error') {
    // Sube al `error.tsx` de la pantalla, que ofrece «Reintentar».
    throw new Error(apertura.error.mensaje)
  }
  const pestanas = <PestanasDeOrigen origenes={origenes} actual={origen.id} leadId={lead} />
  if (apertura.tipo === 'sin_publicar') {
    return (
      <>
        {pestanas}
        <FormulaSinPublicar
          origen={apertura.hoja.origen.nombre}
          puedeConfigurar={apertura.hoja.puedeConfigurar}
        />
      </>
    )
  }
  const vehiculoUsado = vehiculoSoltado ? null : vehiculo
  return (
    <>
      {pestanas}
      {/* Fuera de la hoja (`[data-hoja]`) y del componente con `key`: elegir otro vehículo no la vuelve a montar. */}
      <BarraConHistorial
        origen={origen}
        elegido={vehiculoSoltado ? null : elegido}
        conteo={conteo}
        puedeVer={puede(sesion.permisos, 'vehiculos.ver', origen.id)}
      />
      <PantallaDeCotizar
        key={`${origen.id}:${lead ?? '-'}:${vehiculoUsado ?? '-'}`}
        hoja={apertura.hoja}
        inicial={apertura.inicial}
        vehiculoId={vehiculoUsado}
        vehiculoSoltado={vehiculoSoltado}
        leadId={lead}
        personaId={sesion.usuarioId}
      />
    </>
  )
}
