'use client'

import { useMemo, useState } from 'react'
import { formatearFecha } from '@/shared/lib/fechas'
import { useRegional } from '@/shared/ui/regional'
import type { CalculoDeLaTarjeta } from '../../../entities/calculo-de-la-tarjeta'
import type { LecturaDeLaTarjeta } from '../../../entities/tarjeta/lectura-de-la-tarjeta'
import {
  modeloDeLaTarjeta,
  type ModeloDeTarjeta,
} from '../../../entities/tarjeta/modelo-de-la-tarjeta'
import { useLecturaDeLaTarjeta, type EstadoDeLaLectura } from './use-lectura-de-la-tarjeta'

// Lo que la página sabe de la tarjeta y la hoja no. `guardadaEl`: el día del último guardado de una guardada (P3 a); nulo en la hoja nueva, que dice hoy.
export type PaginaDelModelo = {
  vehiculo: string | null
  asesor: string | null
  numero: number | null
  vencida: boolean
  guardadaEl: string | null
  logo: { nombre: string; url: string } | null
}

type Entrada = {
  formulaId: string
  calculo: CalculoDeLaTarjeta
  monedaBs: string | null
  pagina: PaginaDelModelo
}

// Lo ahora, una vez por montaje: el modal se monta al abrirse y la fecha de hoy no cambia mientras está abierto.
function useHoy(): string {
  const [hoy] = useState(() => new Date().toISOString())
  return hoy
}

// La lectura de la tarjeta y su modelo (4.18-3b): lo comparten el cuerpo del modal, que lo dibuja, y su pie, que lo copia. Sin lectura, el modelo es nulo.
export function useModeloDeLaTarjeta({ formulaId, calculo, monedaBs, pagina }: Entrada): {
  estado: EstadoDeLaLectura
  reintentar: () => void
  lectura: LecturaDeLaTarjeta | null
  modelo: ModeloDeTarjeta | null
} {
  const { estado, reintentar } = useLecturaDeLaTarjeta(formulaId)
  const { zonaHoraria } = useRegional()
  const hoy = useHoy()
  const fecha = formatearFecha(pagina.guardadaEl ?? hoy, { zona: zonaHoraria })
  const lectura = estado.tipo === 'lista' ? estado.lectura : null
  const modelo = useMemo(
    () =>
      lectura === null
        ? null
        : modeloDeLaTarjeta({
            lectura,
            calculo,
            monedaBs,
            pagina: {
              fecha,
              vehiculo: pagina.vehiculo,
              asesor: pagina.asesor,
              numero: pagina.numero,
              vencida: pagina.vencida,
              logo: pagina.logo,
            },
          }),
    [lectura, fecha, pagina, calculo, monedaBs],
  )
  return { estado, reintentar, lectura, modelo }
}
