'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { diaEnZona, formatearDiaYMes, formatearFechaHora } from '@/shared/lib/fechas'
import { Button } from '@/shared/ui/button'
import { MostrarTodos } from '@/shared/ui/mostrar-todos'
import { useRegional } from '@/shared/ui/regional'
import { useLecturaAPedido } from '@/shared/ui/use-lectura-a-pedido'
import { leerLoteDePapelera } from '../../../composicion.client'
import {
  diasParaLaPurga,
  faltanPorMostrar,
  textoDePurga,
  type LoteDePapelera as Lote,
  type VehiculoEnPapelera,
} from '../../../entities/papelera'
import { Miniatura } from '../../listado/components/miniatura'
import type { Objetivo } from '../hooks/use-papelera'

type Origen = { nombre: string; color: string }

type Props = {
  lote: Lote
  // Los orígenes, por su id: de ahí sale el nombre que se muestra junto a cada vehículo.
  origenes: ReadonlyMap<string, Origen>
  // El instante en que el servidor armó la página: contra él se cuentan los días.
  ahora: string
  // Restaura quien envió el lote o quien puede vaciar la papelera; purga sólo este último.
  puedePurgar: boolean
  enCurso: boolean
  alRestaurar: (objetivo: Objetivo) => void
  alPurgar: (objetivo: Objetivo) => void
}

const BOTON = 'h-11 md:h-8'

function Vehiculo({
  vehiculo,
  origen,
  acciones,
}: {
  vehiculo: VehiculoEnPapelera
  origen: Origen | undefined
  acciones: ReactNode
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-2">
      <Miniatura ruta={vehiculo.miniatura} />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="truncate font-medium text-(--color-ink)">{vehiculo.titulo}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-(length:--text-xs) text-(--color-ink-soft)">
          <span className="tabular-nums">#{vehiculo.numero}</span>
          {origen ? (
            <span className="inline-flex items-center gap-1">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: origen.color }}
              />
              {origen.nombre}
            </span>
          ) : null}
        </p>
        {vehiculo.motivoDeBloqueo ? (
          <p className="text-(length:--text-xs) text-(--color-aviso-ink)">
            No se purga: {vehiculo.motivoDeBloqueo} Se puede restaurar.
          </p>
        ) : null}
      </div>
      {acciones}
    </li>
  )
}

// Lo que se puede hacer: restaurar, y purgar si la persona puede vaciar la papelera. `sobre` es
// el nombre del vehículo cuando los botones son de uno solo (para el lector de pantalla).
function Acciones(props: {
  objetivo: Objetivo
  etiquetas: { restaurar: string; purgar: string }
  sobre?: string
  puedeRestaurar: boolean
  puedePurgar: boolean
  apagado: boolean
  purgaBloqueada?: boolean
  alRestaurar: (objetivo: Objetivo) => void
  alPurgar: (objetivo: Objetivo) => void
}) {
  const { objetivo, etiquetas, sobre, apagado } = props
  return (
    <div className="flex flex-wrap gap-2">
      {props.puedeRestaurar ? (
        <Button
          variant="outline"
          className={BOTON}
          disabled={apagado}
          aria-label={sobre ? `Restaurar ${sobre}` : undefined}
          onClick={() => {
            props.alRestaurar(objetivo)
          }}
        >
          {etiquetas.restaurar}
        </Button>
      ) : null}
      {props.puedePurgar ? (
        <Button
          variant="destructive"
          className={BOTON}
          disabled={apagado || props.purgaBloqueada}
          aria-label={sobre ? `Purgar ${sobre}` : undefined}
          onClick={() => {
            props.alPurgar(objetivo)
          }}
        >
          {etiquetas.purgar}
        </Button>
      ) : null}
    </div>
  )
}

const DEL_LOTE = { restaurar: 'Restaurar el lote', purgar: 'Purgar el lote' }
const DE_UNO = { restaurar: 'Restaurar', purgar: 'Purgar' }

// Qué lote es: cuántos se enviaron y cuántos quedan. El de la limpieza automática se dice por su
// origen y su día (el día es del calendario de la empresa).
function tituloDe(lote: Lote, zona: string): string {
  const quedan = lote.enPapelera < lote.enviados ? ` · quedan ${String(lote.enPapelera)}` : ''
  if (lote.esLimpieza) {
    const dia = formatearDiaYMes(diaEnZona(lote.creadoEn, { zona }))
    return `Limpieza automática del ${dia} · ${String(lote.enviados)}${quedan}`
  }
  if (lote.enviados <= 1) {
    return 'Envío de uno'
  }
  return `Lote de ${String(lote.enviados)}${quedan}`
}

// Un lote de la papelera: quién lo envió, cuándo y cuánto falta para que se purgue solo; y sus
// vehículos, cada uno con lo que se puede hacer. Las acciones del lote entero aparecen cuando
// tiene más de uno. Se ven los primeros (cierre 1) y «Mostrar los N» trae el lote entero; si la página se vuelve a leer
// (restaurar, purgar), vuelve a los primeros.
export function LoteDePapelera(props: Props) {
  const { origenes, ahora, puedePurgar, enCurso, alRestaurar, alPurgar } = props
  const router = useRouter()
  const { lectura, pedir } = useLecturaAPedido(
    () => leerLoteDePapelera(props.lote.id),
    props.lote.actualizadoEn,
  )
  const lote = lectura.estado === 'leido' ? lectura.dato : props.lote
  const { zonaHoraria } = useRegional()
  const quien = lote.esLimpieza
    ? 'la limpieza automática'
    : lote.esMio
      ? 'ti'
      : (lote.creadoPorNombre ?? 'alguien que ya no está')
  const comunes = {
    puedeRestaurar: lote.esMio || puedePurgar,
    puedePurgar,
    apagado: enCurso,
    alRestaurar,
    alPurgar,
  }
  return (
    <li>
      <section
        aria-label={`Lote enviado por ${quien}`}
        className="overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)"
      >
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-(--color-line) px-3 py-2">
          <div className="grid gap-0.5">
            <p className="text-(length:--text-sm) font-medium text-(--color-ink)">
              {tituloDe(lote, zonaHoraria)}
            </p>
            <p className="text-(length:--text-xs) text-(--color-ink-soft)">
              Enviado por {quien} el {formatearFechaHora(lote.creadoEn, { zona: zonaHoraria })} ·{' '}
              {textoDePurga(diasParaLaPurga(lote.purgaEl, ahora))}
            </p>
            {lote.esLimpieza ? (
              <p className="text-(length:--text-xs) text-(--color-ink-soft)">
                Era de una subasta que terminó y nadie lo usaba. Al restaurarlo queda marcado como
                «Conservar», para que no vuelva a irse.
              </p>
            ) : null}
          </div>
          {lote.enPapelera > 1 ? (
            <Acciones {...comunes} objetivo={{ lote }} etiquetas={DEL_LOTE} />
          ) : null}
        </header>
        <ul className="divide-y divide-(--color-line)">
          {lote.vehiculos.map((vehiculo) => (
            <Vehiculo
              key={vehiculo.id}
              vehiculo={vehiculo}
              origen={origenes.get(vehiculo.origenId)}
              acciones={
                <Acciones
                  {...comunes}
                  objetivo={{ lote, vehiculoId: vehiculo.id }}
                  etiquetas={DE_UNO}
                  sobre={vehiculo.titulo}
                  purgaBloqueada={vehiculo.motivoDeBloqueo !== null}
                />
              }
            />
          ))}
        </ul>
        <MostrarTodos
          total={lote.enPapelera}
          faltan={faltanPorMostrar(lote)}
          lectura={lectura}
          alPedir={() => void pedir()}
          alRecargar={() => {
            router.refresh()
          }}
        />
      </section>
    </li>
  )
}
