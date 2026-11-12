import { agruparPorDia, encabezadoDelDia } from '../../../entities/calendario'
import type { EntradaDeAgenda } from '../../../entities/agenda'
import { ChipEvento } from './chip-de-agenda'

type Props = {
  entradas: readonly EntradaDeAgenda[]
  // Los días que cubre la vista, en orden.
  dias: readonly string[]
  zona: string
  hoy: string
  // Mes y semana en el celular: sólo los días que tienen algo. El día muestra el suyo aunque esté vacío.
  soloConCosas: boolean
}

// Una lista por día: lo que dibuja el celular en mes y semana, y la vista «día» en todas partes.
export function ListaPorDia({ entradas, dias, zona, hoy, soloConCosas }: Props) {
  const porDia = agruparPorDia(entradas, (entrada) => entrada.instante, zona)
  const conCosas = soloConCosas ? dias.filter((dia) => porDia.has(dia)) : dias
  return (
    <ol className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {conCosas.map((dia) => (
        <li key={dia} className="grid min-w-0 gap-2">
          <h2 className="text-(length:--text-sm) font-semibold text-(--color-ink)">
            {encabezadoDelDia(dia)}
            {dia === hoy ? ' · Hoy' : ''}
          </h2>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-1.5">
            {(porDia.get(dia) ?? []).map((entrada) => (
              <li key={`${entrada.clave}-${entrada.id}`} className="min-w-0">
                <ChipEvento entrada={entrada} zona={zona} />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}
