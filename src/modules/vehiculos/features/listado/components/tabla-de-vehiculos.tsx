'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { Monto } from '@/shared/ui/monto'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { camposDeTarjeta, type CampoDeVehiculo } from '../../../entities/campo'
import { BotonEditarVehiculo } from '../../alta/components/botones'
import { CasillaDeSeleccion } from '../../papelera/components/casilla-de-seleccion'
import type { SeleccionDelListado } from '../../papelera/hooks/use-papelera-del-listado'
import { InsigniaDeLimpieza } from '../../limpieza/components/insignia-de-limpieza'
import { InsigniaDeVitrina } from '../../vitrina/components/insignia-de-vitrina'
import { BadgeDeFase } from './badge-de-fase'
import { Miniatura } from './miniatura'
import { faseDe, vitrinaDe, type DatosDelOrigen, type FilaDeVehiculo } from './tipos'
import { ValorDeCampo } from './valor-de-campo'

type Props = DatosDelOrigen & {
  vehiculos: readonly FilaDeVehiculo[]
  // Cómo se llama lo que entra por este origen («Unidad», «Lote»): encabeza la primera columna.
  encabezado: string
  // Los que la persona puede editar: llevan su botón al final de la fila.
  editables: ReadonlySet<string>
  // Las filas que se pueden elegir (para enviarlas juntas a la papelera) y las elegidas.
  seleccion: SeleccionDelListado
}

const VACIO = <span className="text-(--color-ink-faint)">—</span>

type PropsDeFila = Pick<
  Props,
  'origen' | 'fases' | 'vitrina' | 'limpiezaHoy' | 'editables' | 'seleccion'
> & {
  vehiculo: FilaDeVehiculo
  columnas: readonly CampoDeVehiculo[]
}

// La fila de un vehículo. Las columnas de los extremos (la casilla y «Editar») sólo existen si
// alguna fila de la página las usa.
function FilaDeTabla({
  vehiculo,
  columnas,
  origen,
  fases,
  vitrina,
  limpiezaHoy,
  editables,
  seleccion,
}: PropsDeFila) {
  const fase = faseDe(fases, vehiculo.faseId)
  return (
    <TableRow className="h-(--fila)">
      {seleccion.seleccionables.size > 0 ? (
        <TableCell className="w-px py-0 pr-0 pl-2">
          {seleccion.seleccionables.has(vehiculo.id) ? (
            <CasillaDeSeleccion
              etiqueta={`Seleccionar ${vehiculo.titulo}`}
              elegida={seleccion.elegidas.has(vehiculo.id)}
              alCambiar={() => {
                seleccion.alternar(vehiculo.id)
              }}
            />
          ) : null}
        </TableCell>
      ) : null}
      <TableCell className="py-1 pl-3">
        <div className="flex items-center gap-3">
          <Miniatura ruta={vehiculo.portadaRuta} />
          <div className="grid min-w-0">
            <Link
              href={`${RUTAS.vehiculos}/${vehiculo.id}` as Route}
              className="max-w-72 truncate font-medium text-(--color-ink) underline-offset-2 outline-none hover:underline focus-visible:shadow-(--shadow-focus)"
            >
              {vehiculo.titulo}
            </Link>
            <span className="text-(length:--text-xs) text-(--color-ink-soft) tabular-nums">
              #{vehiculo.numero}
              {vehiculo.vin ? ` · ${vehiculo.vin}` : ''}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-1.5">
          <BadgeDeFase fase={fase} />
          <InsigniaDeVitrina {...vitrinaDe(vehiculo, vitrina)} origen={origen} fase={fase} />
          <InsigniaDeLimpieza fecha={vehiculo.limpiezaEl} hoy={limpiezaHoy} />
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">{vehiculo.anio ?? VACIO}</TableCell>
      <TableCell className="text-right">
        {vehiculo.precio === null ? VACIO : <Monto valor={vehiculo.precio} />}
      </TableCell>
      {columnas.map((campo) => (
        <TableCell key={campo.clave} className="max-w-48 truncate">
          <ValorDeCampo campo={campo} valor={vehiculo.atributos[campo.clave]} />
        </TableCell>
      ))}
      {editables.size > 0 ? (
        <TableCell className="w-px py-0 pr-2 text-right">
          {editables.has(vehiculo.id) ? <BotonEditarVehiculo vehiculo={vehiculo} compacto /> : null}
        </TableCell>
      ) : null}
    </TableRow>
  )
}

// El inventario de un origen en escritorio: lo común adelante y, después, una columna por cada
// campo «en tarjeta» del layout. Las filas tienen la altura de la densidad elegida.
export function TablaDeVehiculos({ vehiculos, campos, encabezado, ...resto }: Props) {
  const { editables, seleccion } = resto
  const columnas = camposDeTarjeta(campos)
  return (
    <div className="overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
      <Table>
        <TableHeader>
          <TableRow>
            {seleccion.seleccionables.size > 0 ? (
              <TableHead className="w-px py-0 pr-0 pl-2">
                <CasillaDeSeleccion
                  etiqueta="Seleccionar todos"
                  elegida={seleccion.elegidas.size === seleccion.seleccionables.size}
                  alCambiar={seleccion.alternarTodas}
                />
              </TableHead>
            ) : null}
            <TableHead className="pl-3">{encabezado}</TableHead>
            <TableHead>Fase</TableHead>
            <TableHead className="text-right">Año</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            {columnas.map((campo) => (
              <TableHead key={campo.clave}>{campo.etiqueta}</TableHead>
            ))}
            {editables.size > 0 ? (
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehiculos.map((vehiculo) => (
            <FilaDeTabla key={vehiculo.id} vehiculo={vehiculo} columnas={columnas} {...resto} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
