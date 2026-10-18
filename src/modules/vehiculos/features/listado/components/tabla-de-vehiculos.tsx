'use client'

import {
  AbrirResumen,
  CabeceraPegada,
  CeldaPegada,
  FilaDeLista,
  TablaDeLista,
} from '@/shared/ui/lista'
import { Monto } from '@/shared/ui/monto'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
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
  alAbrir: (id: string) => void
  // El vehículo abierto en el resumen, para marcarlo.
  abierto: string | null
}

const VACIO = <span className="text-(--color-ink-faint)">—</span>

// El hueco de la casilla en una fila que no se puede elegir: los nombres quedan alineados.
const HUECO_DE_CASILLA = <span aria-hidden className="size-[44px] shrink-0 md:size-7" />

type PropsDeFila = Pick<
  Props,
  'origen' | 'fases' | 'vitrina' | 'limpiezaHoy' | 'editables' | 'seleccion' | 'alAbrir' | 'abierto'
> & {
  vehiculo: FilaDeVehiculo
  columnas: readonly CampoDeVehiculo[]
}

// La fila de un vehículo. La casilla va delante del nombre y «Editar» pegado a la derecha; esa columna sólo existe si alguna fila de
// la página la usa.
function FilaDeTabla({
  vehiculo,
  columnas,
  origen,
  fases,
  vitrina,
  limpiezaHoy,
  editables,
  seleccion,
  alAbrir,
  abierto,
}: PropsDeFila) {
  const fase = faseDe(fases, vehiculo.faseId)
  return (
    <FilaDeLista
      abierta={abierto === vehiculo.id}
      alAbrir={() => {
        alAbrir(vehiculo.id)
      }}
    >
      <CeldaPegada lado="nombre">
        <div className="flex items-center gap-3">
          {seleccion.seleccionables.size > 0 ? (
            seleccion.seleccionables.has(vehiculo.id) ? (
              <CasillaDeSeleccion
                etiqueta={`Seleccionar ${vehiculo.titulo}`}
                elegida={seleccion.elegidas.has(vehiculo.id)}
                alCambiar={() => {
                  seleccion.alternar(vehiculo.id)
                }}
              />
            ) : (
              HUECO_DE_CASILLA
            )
          ) : null}
          <Miniatura ruta={vehiculo.portadaRuta} />
          <div className="grid min-w-0">
            <AbrirResumen
              nombre={vehiculo.titulo}
              className="max-w-72 truncate font-medium text-(--color-ink)"
            >
              {vehiculo.titulo}
            </AbrirResumen>
            <span className="text-(length:--text-xs) text-(--color-ink-soft) tabular-nums">
              #{vehiculo.numero}
              {vehiculo.vin ? ` · ${vehiculo.vin}` : ''}
            </span>
          </div>
        </div>
      </CeldaPegada>
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
        <CeldaPegada lado="acciones" className="text-right">
          {editables.has(vehiculo.id) ? <BotonEditarVehiculo vehiculo={vehiculo} compacto /> : null}
        </CeldaPegada>
      ) : null}
    </FilaDeLista>
  )
}

// El inventario de un origen en escritorio, con el patrón de lista (`@/shared/ui/lista`): lo común adelante y, después, una columna
// por cada campo «en tarjeta» del layout. Un clic en cualquier parte de la fila abre el vehículo, salvo el de la casilla y el de
// «Editar». La tabla es tan ancha como lo pidan sus columnas y se desplaza dentro de su tarjeta, con el nombre a la vista.
export function TablaDeVehiculos({ vehiculos, campos, encabezado, ...resto }: Props) {
  const { editables, seleccion } = resto
  const columnas = camposDeTarjeta(campos)
  return (
    <TablaDeLista>
      <TableHeader>
        <TableRow>
          <CabeceraPegada lado="nombre">
            <div className="flex items-center gap-3">
              {seleccion.seleccionables.size > 0 ? (
                <CasillaDeSeleccion
                  etiqueta="Seleccionar todos"
                  elegida={seleccion.elegidas.size === seleccion.seleccionables.size}
                  alCambiar={seleccion.alternarTodas}
                />
              ) : null}
              {encabezado}
            </div>
          </CabeceraPegada>
          <TableHead>Fase</TableHead>
          <TableHead className="text-right">Año</TableHead>
          <TableHead className="text-right">Precio</TableHead>
          {columnas.map((campo) => (
            <TableHead key={campo.clave}>{campo.etiqueta}</TableHead>
          ))}
          {editables.size > 0 ? (
            <CabeceraPegada lado="acciones">
              <span className="sr-only">Acciones</span>
            </CabeceraPegada>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {vehiculos.map((vehiculo) => (
          <FilaDeTabla key={vehiculo.id} vehiculo={vehiculo} columnas={columnas} {...resto} />
        ))}
      </TableBody>
    </TablaDeLista>
  )
}
