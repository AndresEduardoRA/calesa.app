'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { EstadoSinResultados, EstadoVacio } from '@/shared/ui/estados'
import { useFiltrosDelListado } from '@/shared/ui/filtros'
import { UnaSolaVista } from '@/shared/ui/lista'
import { useRegional } from '@/shared/ui/regional'
import type { PaginaDeActividad } from '../../../entities/actividad'
import { agruparPorDia, type PedidoDeActividad } from '../../../entities/filtros'
import { useActividad } from '../hooks/use-actividad'
import { PieDeActividad, VolverALoMasReciente } from './pie-de-actividad'
import { TablaDeActividad } from './tabla-de-actividad'
import { TarjetasDeActividad } from './tarjetas-de-actividad'

type Props = {
  inicial: PaginaDeActividad
  pedido: PedidoDeActividad
  // El día de hoy en la zona de la empresa (`YYYY-MM-DD`), calculado en el servidor: «Hoy» y «Ayer» no cambian al hidratar.
  hoy: string
  // `ajustes_empresa.actividad_dias`: cuánto se conserva.
  diasDeActividad: number
  // Abre el diff de una fila visible; `idAbierto` marca la fila del drawer abierto.
  abrir: (id: number) => void
  idAbierto: number | null
}

// La lista o el estado que corresponda: vacío de primera vez, vacío por filtro (con «Limpiar filtros»), vacío desde una fecha (con «Volver»)
// o la actividad por día con su pie. Una sola vista: la tabla desde `md` y las tarjetas por debajo.
export function ResultadoDeActividad({
  inicial,
  pedido,
  hoy,
  diasDeActividad,
  abrir,
  idAbierto,
}: Props) {
  const { zonaHoraria } = useRegional()
  const filtros = useFiltrosDelListado()
  const actividad = useActividad({ inicial, pedido, zona: zonaHoraria })

  if (actividad.filas.length === 0) {
    if (actividad.desde !== null) {
      return (
        <div className="grid gap-3">
          <EstadoVacio
            titulo={`No hay actividad hasta el ${formatearFecha(actividad.desde, { zona: zonaHoraria })}.`}
          />
          <div className="flex justify-center">
            <VolverALoMasReciente actividad={actividad} />
          </div>
        </div>
      )
    }
    if (filtros.hayFiltros || pedido.registro !== null) {
      return (
        <EstadoSinResultados
          alLimpiar={filtros.limpiar}
          descripcion="Ningún cambio coincide con los filtros."
        />
      )
    }
    return (
      <EstadoVacio titulo={`Todavía no hay actividad de los últimos ${diasDeActividad} días.`} />
    )
  }

  const dias = agruparPorDia(actividad.filas, zonaHoraria, hoy)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {actividad.desde !== null ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Desde el {formatearFecha(actividad.desde, { zona: zonaHoraria })}.
        </p>
      ) : null}
      <UnaSolaVista
        tabla={() => <TablaDeActividad dias={dias} abrir={abrir} idAbierto={idAbierto} />}
        tarjetas={() => <TarjetasDeActividad dias={dias} abrir={abrir} idAbierto={idAbierto} />}
      />
      <PieDeActividad actividad={actividad} zona={zonaHoraria} />
    </div>
  )
}
