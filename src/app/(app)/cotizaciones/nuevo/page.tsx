import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { z } from 'zod'
import {
  aperturaDe,
  contarCotizacionesDelVehiculo,
  datosDelVehiculoDeLaHoja,
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
import { integracionActiva } from '@/modules/empresa'
import { getOrigenes, leerLayout, type OrigenResumen } from '@/modules/origenes'
import {
  datosParaElegirDe,
  editablesDe,
  elegidoDesde,
  leerVehiculo,
  permisoDeAlta,
  type Vehiculo,
  type VehiculoElegido,
} from '@/modules/vehiculos'
import type { AltaDelPanel, ParaElegir } from '@/modules/vehiculos/pantallas/cotizar'
import { conteoCorto } from '@/shared/lib/conteo'
import { datosO } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { BarraDeLaHoja } from './barra-de-la-hoja'

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

type Quien = { permisos: Permisos; usuarioId: string }

// El vehículo de la URL, con si quien mira lo puede editar (en serie: `editablesDe` necesita el vehículo leído; casi siempre sin ir a la base); null si no vino, no existe o
// no se ve.
async function elegidoDeLaUrl(quien: Quien, id: string | null) {
  if (id === null) {
    return null
  }
  const leido = await leerVehiculo(id)
  if (!leido.ok || !leido.data) {
    return null
  }
  const editables = await editablesDe(quien, [leido.data])
  return { vehiculo: leido.data, editable: editables.has(leido.data.id) }
}

// El layout del origen sólo hace falta con un vehículo: dice qué datos del vehículo se eligen en el panel.
const layoutSiHayVehiculo = (origenId: string, vehiculo: string | null) =>
  vehiculo === null ? null : leerLayout(origenId, { conUso: false })

// Lo que el panel ofrece elegir del vehículo entre las filas de una tabla de la hoja (4.14-2c3, el tipo de vehículo del transporte): sólo con un elegido y su layout.
function paraElegirDe(
  hoja: Parameters<typeof datosDelVehiculoDeLaHoja>[0],
  elegido: { vehiculo: Vehiculo; editable: boolean } | null,
  layout: Awaited<ReturnType<typeof leerLayout>> | null,
): ParaElegir | null {
  if (elegido === null || layout === null || !layout.ok) {
    return null
  }
  const datos = datosDelVehiculoDeLaHoja(hoja)
  return datos.length === 0
    ? null
    : datosParaElegirDe(elegido.vehiculo, datos, layout.data.campos, elegido.editable)
}

// Los campos que quien mira elige en el panel: la celda sin valor por uno de ellos dice dónde se elige.
const camposQueSeEligen = (paraElegir: ParaElegir | null): string[] =>
  paraElegir?.editable ? paraElegir.datos.map((dato) => dato.campo) : []

// Lo que el panel del vehículo necesita para dar de alta desde él: sólo si quien mira ve los vehículos del origen y puede crearlos en él (el origen de la hoja está
// siempre activo). Se lee a la vez que la hoja. El layout del origen no viaja: el alta lo lee desde el navegador al abrirse (P2 del 4.14-2c).
async function altaDelPanelDe(
  permisos: Permisos,
  origen: OrigenResumen,
): Promise<AltaDelPanel | null> {
  if (
    !puede(permisos, 'vehiculos.ver', origen.id) ||
    permisoDeAlta(permisos, origen).estado !== 'habilitado'
  ) {
    return null
  }
  const activa = origen.tipo === 'subasta' ? await integracionActiva('apibara') : false
  return {
    origen,
    apibara: { activa, puedeConfigurar: puede(permisos, 'empresa.ajustes.gestionar') },
  }
}

// La barra del vehículo con su «Cotizado (n)» y su historial. Lo une esta página: `vehiculos` recibe el historial armado, sin importar `cotizaciones`. Sin elegido (soltado
// por la hoja, inexistente o que no se ve) no hay insignia ni historial; un conteo que falló es sólo una etiqueta menos. Plegado, el historial se lee al desplegarlo.
function BarraConHistorial({
  origen,
  elegido,
  conteo,
  alta,
  puedeVer,
  paraElegir,
  abierta,
}: {
  origen: { id: string; tipo: string }
  elegido: VehiculoElegido | null
  conteo: Awaited<ReturnType<typeof contarCotizacionesDelVehiculo>> | null
  alta: AltaDelPanel | null
  puedeVer: boolean
  paraElegir: ParaElegir | null
  abierta: string
}) {
  const cotizado = elegido && conteo?.ok ? conteo.data : null
  // El «n» de la insignia ya escrito («2», «20+»); con 0, sin insignia. La barra va en la carga en frío de la hoja y recibe el texto, no el conteo.
  const insignia = cotizado !== null && cotizado.n > 0 ? conteoCorto(cotizado) : null
  return (
    <BarraDeLaHoja
      origenId={origen.id}
      esSubasta={origen.tipo === 'subasta'}
      elegido={elegido}
      alta={alta}
      puedeVer={puedeVer}
      claveDeLaUrl={CLAVE_DE_VEHICULO}
      cotizado={insignia}
      paraElegir={paraElegir}
      abierta={abierta}
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
  // Con un vehículo, el layout del origen (qué datos del vehículo se eligen en el panel) también va en paralelo.
  const [{ apertura, vehiculoSoltado }, leido, conteo, alta, layout] = await Promise.all([
    abrirLaHoja(origen.id, vehiculo),
    elegidoDeLaUrl(sesion, vehiculo),
    vehiculo === null ? null : contarCotizacionesDelVehiculo(vehiculo),
    altaDelPanelDe(sesion.permisos, origen),
    layoutSiHayVehiculo(origen.id, vehiculo),
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
  const elegido = vehiculoSoltado ? null : leido
  const paraElegir = paraElegirDe(apertura.hoja, elegido, layout)
  return (
    <>
      {pestanas}
      {/* Fuera de la hoja (`[data-hoja]`) y del componente con `key`: elegir otro vehículo no la vuelve a montar. */}
      <BarraConHistorial
        origen={origen}
        elegido={elegido ? elegidoDesde(elegido.vehiculo) : null}
        conteo={conteo}
        alta={alta}
        puedeVer={puede(sesion.permisos, 'vehiculos.ver', origen.id)}
        paraElegir={paraElegir}
        abierta={apertura.hoja.abierta}
      />
      <PantallaDeCotizar
        key={`${origen.id}:${lead ?? '-'}:${vehiculoUsado ?? '-'}`}
        hoja={apertura.hoja}
        inicial={apertura.inicial}
        vehiculoId={vehiculoUsado}
        vehiculoSoltado={vehiculoSoltado}
        leadId={lead}
        personaId={sesion.usuarioId}
        // La celda sin valor por un dato que quien mira elige en el panel dice dónde se elige (4.14-2c3).
        seEligen={camposQueSeEligen(paraElegir)}
      />
    </>
  )
}
