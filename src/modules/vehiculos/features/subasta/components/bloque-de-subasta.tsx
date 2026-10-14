import type { ReactNode } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Badge } from '@/shared/ui/badge'
import { Monto } from '@/shared/ui/monto'
import { formatearFechaHora, fechaRelativa } from '@/shared/lib/fechas'
import type { Vehiculo } from '../../../entities/vehiculo'
import {
  entradaDeRefresco,
  etiquetaDeEstado,
  type EstadoDeSubasta,
} from '../../../entities/subasta'
import type { SubastaDeVehiculo } from '../../../entities/subasta-vehiculo'
import { cuentaRegresiva, estaDesactualizada } from '../../../entities/subasta-tiempo'
import { BotonRefrescarSubasta } from './boton-refrescar-subasta'

type DatosProps = {
  subasta: SubastaDeVehiculo
  ahora: Date
  zona: string
}

type Props = {
  vehiculo: Pick<Vehiculo, 'id' | 'origenId' | 'urlOrigen' | 'lote' | 'vin' | 'actualizadoEn'>
  subasta: SubastaDeVehiculo
  // Cuándo es «ahora» (ISO): lo fija quien lo pone, así la cuenta regresiva no depende del reloj
  // de cada render.
  ahora: string
  zona: string
  // apibara está encendida, y quien mira puede editar el vehículo.
  puedeRefrescar: boolean
  // Quien puede ir a Integraciones si la clave o la cuota frenan.
  puedeConfigurar: boolean
}

const TONO_DE_ESTADO: Record<EstadoDeSubasta, 'default' | 'secondary' | 'outline'> = {
  abierta: 'secondary',
  en_vivo: 'default',
  terminada: 'outline',
  vendida: 'outline',
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-0.5">
      <dt className="text-(length:--text-xs) text-(--color-ink-soft)">{etiqueta}</dt>
      <dd className="text-(length:--text-sm) text-(--color-ink)">{children}</dd>
    </div>
  )
}

// Las cifras de apibara van en dólares (así las publica la plataforma) y pasan por <Monto>.
function Cifras({ subasta }: Pick<DatosProps, 'subasta'>) {
  return (
    <>
      {subasta.pujaActual !== null ? (
        <Dato etiqueta="Puja actual">
          <Monto valor={subasta.pujaActual} moneda="USD" />
        </Dato>
      ) : null}
      {subasta.compraInmediata !== null ? (
        <Dato etiqueta="Compra inmediata">
          <Monto valor={subasta.compraInmediata} moneda="USD" />
        </Dato>
      ) : null}
      {subasta.precioDeVenta !== null ? (
        <Dato etiqueta="Precio de venta">
          <Monto valor={subasta.precioDeVenta} moneda="USD" />
        </Dato>
      ) : null}
    </>
  )
}

function DatosDeLaSubasta({ subasta, ahora, zona }: DatosProps) {
  const cuenta = subasta.subastaEn ? cuentaRegresiva(subasta.subastaEn, ahora) : null
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      <Dato etiqueta="Fecha de la subasta">
        {subasta.subastaEn
          ? `${formatearFechaHora(subasta.subastaEn, { zona })}${cuenta ? ` · ${cuenta.texto}` : ''}`
          : 'Sin fecha'}
      </Dato>
      <Dato etiqueta="Última consulta a apibara">
        {subasta.sincronizadoEn ? fechaRelativa(subasta.sincronizadoEn, { zona, ahora }) : 'Nunca'}
      </Dato>
      <Cifras subasta={subasta} />
    </dl>
  )
}

// La subasta de un vehículo: cuándo es, en qué está, cuánto va y cuándo se consultó por última vez.
export function BloqueDeSubasta({
  vehiculo,
  subasta,
  ahora,
  zona,
  puedeRefrescar,
  puedeConfigurar,
}: Props) {
  const instante = new Date(ahora)
  const entrada = entradaDeRefresco(vehiculo)
  const vieja = estaDesactualizada(subasta.estado, subasta.subastaEn, instante)
  return (
    <section
      aria-label="Subasta"
      className="grid gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-(length:--text-base) font-medium text-(--color-ink)">Subasta</h2>
          {subasta.estado ? (
            <Badge variant={TONO_DE_ESTADO[subasta.estado]}>
              {etiquetaDeEstado(subasta.estado)}
            </Badge>
          ) : null}
        </div>
        {puedeRefrescar && entrada ? (
          <BotonRefrescarSubasta
            vehiculoId={vehiculo.id}
            origenId={vehiculo.origenId}
            entrada={entrada}
            actualizadoEn={vehiculo.actualizadoEn}
            puedeConfigurar={puedeConfigurar}
          />
        ) : null}
      </div>
      <DatosDeLaSubasta subasta={subasta} ahora={instante} zona={zona} />
      {vieja ? (
        <Aviso tono="aviso">
          La subasta ya debía haber empezado.{' '}
          {puedeRefrescar ? 'Refresca para ver cómo terminó.' : 'Lo que ves puede estar viejo.'}
        </Aviso>
      ) : null}
    </section>
  )
}
