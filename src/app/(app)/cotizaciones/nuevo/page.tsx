import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { z } from 'zod'
import {
  aperturaDe,
  CLAVE_DE_LEAD,
  CLAVE_DE_ORIGEN,
  CLAVE_DE_VEHICULO,
  leerHojaParaCotizar,
  origenElegido,
  origenesParaCotizar,
  recalcularAlAbrir,
} from '@/modules/cotizaciones'
import {
  EsqueletoDeHoja,
  FormulaSinPublicar,
  PantallaDeCotizar,
  PestanasDeOrigen,
} from '@/modules/cotizaciones/pantallas/cotizar'
import { requerirSesion } from '@/modules/equipo'
import { getOrigenes } from '@/modules/origenes'
import { datosO } from '@/shared/lib/errores'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'

export const metadata: Metadata = { title: 'Cotizar' }

// La hoja de cotizar (`docs/UX.md` › «Cotizar»): una pestaña por origen donde la persona cotiza y, de cada uno, la hoja que dibuja su fórmula publicada. `?origen=`
// elige el origen; `?lead=` y `?vehiculo=` llegan de la ficha del lead o del vehículo (sus paneles son del 4.14): se validan y se llevan. Sin entrada en la navegación
// todavía: se llega por URL. Guarda con el lead de la URL (4.13-3b); sin él, «Guardar» dice por qué no.
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
      ? await recalcularAlAbrir({ origenId, vehiculoId, abierta: hoja.data.abierta })
      : null
  return {
    apertura: aperturaDe(hoja, alAbrir?.resultado ?? null),
    vehiculoSoltado: alAbrir?.vehiculoSoltado ?? false,
  }
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
  const { apertura, vehiculoSoltado } = await abrirLaHoja(origen.id, vehiculo)
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
