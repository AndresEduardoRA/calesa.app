'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatearFecha } from '@/shared/lib/fechas'
import { EstadoError, EstadoSinPermiso } from '@/shared/ui/estados'
import { Modal } from '@/shared/ui/modal'
import { useRegional } from '@/shared/ui/regional'
import { Skeleton } from '@/shared/ui/skeleton'
import { EstiloDeTonos } from '@/shared/ui/xcell'
import { LiveDelResumen } from '../../hoja/components/live-del-resumen'
import type { PropsDeLaVistaPrevia } from '../../hoja/components/huecos'
import {
  modeloDeLaTarjeta,
  type PaginaDeLaTarjeta,
} from '../../../entities/tarjeta/modelo-de-la-tarjeta'
import type { LecturaDeLaTarjeta } from '../../../entities/tarjeta/lectura-de-la-tarjeta'
import { useLecturaDeLaTarjeta } from '../hooks/use-lectura-de-la-tarjeta'
import { TarjetaDeCotizacion } from './tarjeta-de-cotizacion'

// Lo que la página sabe de la tarjeta y la hoja no: lo da `<ProveedorDeLaTarjeta>`. `guardadaEl`: el día del último guardado de una guardada (P3 a); nulo en la hoja nueva, que dice hoy.
export type DatosDeLaPagina = {
  vehiculo: string | null
  asesor: string | null
  numero: number | null
  vencida: boolean
  guardadaEl: string | null
  logo: { nombre: string; url: string } | null
}

type Props = PropsDeLaVistaPrevia & { pagina: DatosDeLaPagina }

// Lo ahora, una vez por montaje: el modal se monta al abrirse y la fecha de hoy no cambia mientras está abierto.
function useHoy(): string {
  const [hoy] = useState(() => new Date().toISOString())
  return hoy
}

function EsqueletoDeLaTarjeta() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const espera = setTimeout(() => {
      setVisible(true)
    }, 300)
    return () => {
      clearTimeout(espera)
    }
  }, [])
  return (
    <div aria-busy="true" aria-label="Cargando la tarjeta" className="grid gap-2">
      {visible ? (
        <>
          <Skeleton className="h-16" />
          <Skeleton className="h-24" />
          <Skeleton className="h-16" />
        </>
      ) : null}
    </div>
  )
}

// Lo que el modal dice fuera de la tarjeta: la tarjeta es lo que ve el cliente y no lleva avisos de trabajo.
function Avisos({
  lectura,
  props,
}: {
  lectura: LecturaDeLaTarjeta
  props: Pick<Props, 'calculo' | 'estado' | 'avisos'>
}) {
  const { calculo, estado, avisos } = props
  const textos = [
    estado !== null && estado.tipo !== 'al_dia' && calculo.totales.usd !== null
      ? 'Total desactualizado.'
      : null,
    lectura.estado === 'sin_plantilla'
      ? 'Este origen no tiene una plantilla de tarjeta para esta versión de la fórmula: la tarjeta va sólo con el total.'
      : null,
    avisos.difiere ? 'Lo de hoy no es lo guardado: la tarjeta muestra lo guardado.' : null,
    avisos.cambiosSinGuardar
      ? 'Tus cambios sin guardar no están en la tarjeta: guarda para verlos.'
      : null,
  ].filter((t) => t !== null)
  return (
    <div role="status" className="grid gap-1">
      {textos.map((texto) => (
        <p key={texto} className="text-(length:--text-sm) text-(--color-ink-soft)">
          {texto}
        </p>
      ))}
    </div>
  )
}

function Cuerpo({ props }: { props: Props }) {
  const { estado, reintentar } = useLecturaDeLaTarjeta(props.formulaId)
  const { zonaHoraria } = useRegional()
  const hoy = useHoy()
  const { pagina } = props
  const fecha = formatearFecha(pagina.guardadaEl ?? hoy, { zona: zonaHoraria })
  const lectura = estado.tipo === 'lista' ? estado.lectura : null
  const modelo = useMemo(() => {
    if (lectura === null) {
      return null
    }
    const delaPagina: PaginaDeLaTarjeta = {
      fecha,
      vehiculo: pagina.vehiculo,
      asesor: pagina.asesor,
      numero: pagina.numero,
      vencida: pagina.vencida,
      logo: pagina.logo,
    }
    return modeloDeLaTarjeta({
      lectura,
      calculo: props.calculo,
      monedaBs: props.monedaBs,
      pagina: delaPagina,
    })
  }, [lectura, fecha, pagina, props.calculo, props.monedaBs])
  if (estado.tipo === 'cargando') {
    return <EsqueletoDeLaTarjeta />
  }
  if (estado.tipo === 'sin_permiso') {
    return <EstadoSinPermiso titulo="No puedes ver la tarjeta de esta cotización." />
  }
  if (estado.tipo === 'error' || lectura === null || modelo === null) {
    return (
      <div role="alert">
        <EstadoError titulo="No se pudo leer la tarjeta." alReintentar={reintentar} />
      </div>
    )
  }
  return (
    <div className="grid min-w-0 gap-3">
      <EstiloDeTonos tonos={modelo.tonos} />
      <Avisos lectura={lectura} props={props} />
      <TarjetaDeCotizacion modelo={modelo} />
    </div>
  )
}

// La vista previa de la tarjeta (4.18-2): un modal con su URL (`?panel=vista-previa`) que dibuja la tarjeta tal como la vería el cliente. Se monta la primera vez que se abre
// (`useAbiertoAlgunaVez`, con `diferido()`): la hoja no carga la tarjeta, su modelo ni su lectura para dibujarse.
export default function VistaPreviaDeLaTarjeta(props: Props) {
  return (
    <Modal
      abierto={props.abierta}
      alCerrar={props.cerrar}
      titulo="Vista previa"
      ancho="amplio"
      pie={<LiveDelResumen />}
    >
      <Cuerpo props={props} />
    </Modal>
  )
}
