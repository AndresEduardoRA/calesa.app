import { LoaderCircleIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from 'cn'
import { NOMBRE_DE_PLATAFORMA, type PlataformaApibara } from '@/shared/lib/apibara'
import { RUTAS } from '@/shared/lib/rutas'
import { Button } from '@/shared/ui/button'
import { pideRevisarIntegracion } from '../../../entities/apibara'
import type { DatosDeSubasta } from '../../../entities/subasta'
import { sePuedeReintentarLinea, type Linea } from '../lineas'

export const RUTA_DE_INTEGRACIONES = `${RUTAS.empresa}?seccion=integraciones` as Route

type Props = {
  linea: Linea
  // Es la que está cargada en el formulario.
  usada: boolean
  ocupado: boolean
  // Quien puede ir a Integraciones (si la clave o la cuota frenan).
  puedeConfigurar: boolean
  alUsar: () => void
  alReintentar: () => void
  alSeguirAMano: () => void
}

function descripcionDe(datos: DatosDeSubasta): string {
  const { anio, lote, plataforma } = datos.columnas
  const nombre = plataforma ? NOMBRE_DE_PLATAFORMA[plataforma as PlataformaApibara] : undefined
  return [anio ? String(anio) : null, lote ? `lote ${lote}` : null, nombre ?? plataforma]
    .filter((parte): parte is string => parte !== null && parte !== undefined)
    .join(' · ')
}

function enlaceAFicha(id: string, texto: string) {
  return (
    <Link
      href={`${RUTAS.vehiculos}/${id}` as Route}
      className="text-(--color-primary) underline underline-offset-2"
    >
      {texto}
    </Link>
  )
}

type Dicho = { titulo: string; detalle: ReactNode; problema: boolean }

const normal = (titulo: string, detalle: ReactNode): Dicho => ({ titulo, detalle, problema: false })
const conProblema = (titulo: string, detalle: ReactNode): Dicho => ({
  titulo,
  detalle,
  problema: true,
})

function aFicha(estado: Extract<Linea['estado'], { tipo: 'repetida' }>, texto: string): Dicho {
  const titulo = typeof estado.ficha.data['title'] === 'string' ? estado.ficha.data['title'] : texto
  return conProblema(
    titulo,
    estado.vehiculoId ? (
      <>Ya está en el inventario. {enlaceAFicha(estado.vehiculoId, 'Abrir')}</>
    ) : (
      'Ya existe un vehículo así, pero no tienes acceso a verlo.'
    ),
  )
}

const CONSULTANDO = (
  <span className="inline-flex items-center gap-1.5">
    <LoaderCircleIcon aria-hidden className="size-3.5 animate-spin motion-reduce:hidden" />
    Consultando…
  </span>
)

// Lo que dice una línea: su título y en qué quedó.
function dichoDe({ linea, usada }: Pick<Props, 'linea' | 'usada'>): Dicho {
  const { estado, texto } = linea
  switch (estado.tipo) {
    case 'esperando':
      return normal(texto, 'En cola.')
    case 'consultando':
      return normal(texto, CONSULTANDO)
    case 'lista':
      return normal(
        estado.datos.columnas.titulo ?? texto,
        usada ? 'En el formulario.' : descripcionDe(estado.datos),
      )
    case 'repetida':
      return aFicha(estado, texto)
    case 'fallida':
      return conProblema(texto, estado.mensaje)
    case 'sin_guardar':
      return conProblema(estado.datos.columnas.titulo ?? texto, `No se guardó: ${estado.motivo}`)
    case 'guardada':
      return normal(
        texto,
        <>
          Guardada{estado.numero ? ` como #${String(estado.numero)}` : ''}.{' '}
          {enlaceAFicha(estado.vehiculoId, 'Abrir ficha')}
        </>,
      )
  }
}

// Qué se le ofrece a la persona en una línea.
function Acciones({
  linea,
  usada,
  ocupado,
  puedeConfigurar,
  alUsar,
  alReintentar,
  alSeguirAMano,
}: Props) {
  const { estado } = linea
  if ((estado.tipo === 'lista' || estado.tipo === 'sin_guardar') && !usada) {
    return (
      <Button type="button" size="sm" variant="outline" disabled={ocupado} onClick={alUsar}>
        Revisar y guardar
      </Button>
    )
  }
  if (estado.tipo !== 'fallida') {
    return null
  }
  const llevaAIntegraciones =
    estado.codigo !== null && pideRevisarIntegracion(estado.codigo) && puedeConfigurar
  return (
    <>
      {sePuedeReintentarLinea(linea) ? (
        <Button type="button" size="sm" variant="outline" disabled={ocupado} onClick={alReintentar}>
          Reintentar
        </Button>
      ) : null}
      {linea.entrada ? (
        <Button type="button" size="sm" variant="ghost" disabled={ocupado} onClick={alSeguirAMano}>
          Seguir a mano
        </Button>
      ) : null}
      {llevaAIntegraciones ? (
        <Link
          href={RUTA_DE_INTEGRACIONES}
          className="inline-flex h-7 items-center text-(length:--text-sm) text-(--color-primary) underline underline-offset-2"
        >
          Ir a Integraciones
        </Link>
      ) : null}
    </>
  )
}

// Una línea de lo pegado: lo que se entendió de ella, en qué quedó y qué se puede hacer.
export function LineaDeSubasta(props: Props) {
  const { titulo, detalle, problema } = dichoDe(props)
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
      <div className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate text-(length:--text-sm) font-medium text-(--color-ink)">
          {titulo}
        </span>
        <span
          className={cn(
            'text-(length:--text-xs)',
            problema ? 'text-(--color-peligro-ink)' : 'text-(--color-ink-soft)',
          )}
        >
          {detalle}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Acciones {...props} />
      </div>
    </li>
  )
}
