'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { fechaRelativa } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { Button, buttonVariants } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import { Skeleton } from '@/shared/ui/skeleton'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { ETIQUETA_DE_APROBADA, ETIQUETA_DE_CLASE } from '../../../entities/historial-del-vehiculo'
import { rutaDeLaCotizacion } from '../../../entities/ruta-de-la-hoja'
import {
  MENSAJE_DE_COTIZACION_NO_DISPONIBLE,
  vistaDelResumen,
  type LecturaDelServidor,
  type VistaDelResumen,
} from '../../../entities/listado/resumen-del-listado'
import { usePedidoAlServidor } from '../hooks/use-pedido-al-servidor'
import { useResumenDeCotizacion } from '../hooks/use-resumen-de-cotizacion'
import { nombreDelOrigen, SIN_NOMBRE, type FilaDeCotizacion, type OrigenDelListado } from './tipos'
import { Vigencia } from './vigencia'

type Props = {
  // Las filas de la página: de ahí sale lo que se ve de inmediato.
  filas: readonly FilaDeCotizacion[]
  origenes: readonly OrigenDelListado[]
  // Lo que el servidor leyó de la cotización de la URL cuando no está en la página.
  delServidor: LecturaDelServidor | null
}

function EsqueletoDelResumen() {
  return (
    <div aria-busy="true" aria-label="Cargando la cotización" className="grid gap-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

function Dato({ nombre, children }: { nombre: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-(length:--text-xs) text-(--color-ink-soft)">{nombre}</dt>
      <dd className="text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink)">
        {children}
      </dd>
    </div>
  )
}

function DetalleDeLaCotizacion({ cotizacion }: { cotizacion: FilaDeCotizacion }) {
  const { zonaHoraria } = useRegional()
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Badge variant="secondary">{ETIQUETA_DE_CLASE[cotizacion.clase]}</Badge>
        {cotizacion.aprobada ? <Badge variant="secondary">{ETIQUETA_DE_APROBADA}</Badge> : null}
        <Vigencia venceEl={cotizacion.venceEl} vencida={cotizacion.vencida} />
      </div>
      {cotizacion.titulo ? (
        <p className="text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink)">
          {cotizacion.titulo}
        </p>
      ) : null}
      <p className="text-(length:--text-lg) font-medium tabular-nums">
        <Monto valor={cotizacion.totalBase} />
      </p>
      <dl className="grid gap-3">
        <Dato nombre="Cliente">{cotizacion.cliente ?? SIN_NOMBRE}</Dato>
        <Dato nombre="Vehículo">{cotizacion.vehiculo ?? SIN_NOMBRE}</Dato>
        <Dato nombre="Creada">
          {fechaRelativa(cotizacion.creadoEn, { zona: zonaHoraria })} · {cotizacion.autor}
        </Dato>
      </dl>
      <Link
        href={rutaDeLaCotizacion(cotizacion.id) as Route}
        className={buttonVariants({ className: 'h-11 w-fit md:h-9' })}
      >
        Abrir cotización
      </Link>
    </div>
  )
}

function ContenidoDelResumen({
  vista,
  ultimo,
  reintentar,
}: {
  vista: VistaDelResumen
  ultimo: FilaDeCotizacion | null
  reintentar: () => void
}) {
  if (vista.tipo === 'no_disponible') {
    return (
      <p role="status" className="text-(length:--text-sm) text-(--color-ink)">
        {MENSAJE_DE_COTIZACION_NO_DISPONIBLE}
      </p>
    )
  }
  if (vista.tipo === 'error') {
    return (
      <div role="alert" className="grid gap-3">
        <p className="text-(length:--text-sm) text-(--color-ink)">
          No se pudo cargar la cotización.
        </p>
        <Button type="button" variant="outline" onClick={reintentar} className="w-fit">
          Reintentar
        </Button>
      </div>
    )
  }
  // La última que se mostró sólo mientras se cierra (`vista` es `cerrado`).
  const cotizacion =
    vista.tipo === 'cotizacion' ? vista.cotizacion : vista.tipo === 'cerrado' ? ultimo : null
  return cotizacion === null ? (
    <EsqueletoDelResumen />
  ) : (
    <DetalleDeLaCotizacion cotizacion={cotizacion} />
  )
}

// El resumen de una cotización (`?cotizacion=`) sin salir del listado: lo que ya trae su fila, con «Abrir cotización» a su página. De sólo lectura: sin «⋯» ni otra acción (son de los
// pasos 4.2x). Si la cotización no está en la página, la leyó el servidor (`delServidor`); si tampoco, se le pide una vez (`router.refresh()`) y, si no llega, dice «error» con «Reintentar».
// Una que no existe o que quien mira no ve dice lo mismo, sin explicar por qué.
export function ResumenDeCotizacion({ filas, origenes, delServidor }: Props) {
  const resumen = useResumenDeCotizacion()
  const base = vistaDelResumen({ texto: resumen.texto, filas, delServidor, yaPedido: false })
  const pedido = usePedidoAlServidor(resumen.id, base.tipo === 'cargando')
  const vistaPedida = vistaDelResumen({
    texto: resumen.texto,
    filas,
    delServidor,
    yaPedido: pedido.yaPedido,
  })
  // Mientras el pedido está en camino (el primero o un «Reintentar») se espera: el esqueleto, no el error.
  const vista: VistaDelResumen =
    vistaPedida.tipo === 'error' && pedido.pendiente ? { tipo: 'cargando' } : vistaPedida
  const ultimo = useUltimo(vista.tipo === 'cotizacion' ? vista.cotizacion : null)
  const mostrada = vista.tipo === 'cotizacion' ? vista.cotizacion : ultimo
  const sinCotizacion = vista.tipo === 'no_disponible'
  return (
    <Drawer
      abierto={resumen.texto !== null}
      alCerrar={resumen.cerrar}
      titulo={
        sinCotizacion
          ? 'Cotización no disponible'
          : mostrada === null
            ? 'Cotización'
            : `Cotización n.º ${String(mostrada.numero)}`
      }
      descripcion={
        sinCotizacion || mostrada === null
          ? undefined
          : nombreDelOrigen(origenes, mostrada.origenId)
      }
    >
      <ContenidoDelResumen vista={vista} ultimo={ultimo} reintentar={pedido.pedir} />
    </Drawer>
  )
}
