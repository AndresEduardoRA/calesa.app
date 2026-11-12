'use client'

import { ImageIcon, Trash2Icon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/shared/ui/button'
import { Monto } from '@/shared/ui/monto'
import { XCell } from '@/shared/ui/xcell'
import {
  LARGO_MAXIMO_DE_DESCRIPCION,
  LARGO_MAXIMO_DE_NOTAS_DEL_ITEM,
  LARGO_MAXIMO_DE_TRACKING,
  type ColumnaEditable,
} from '../../../entities/items/celda'
import type { ClaveDeCatalogoDeLaHoja, ValorDeLaHoja } from '../../../entities/items/hoja'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import { CeldaDeSeleccion, type OpcionDeCelda } from './celda-de-seleccion'
import { CeldaDeTexto } from './celda-de-texto'
import type { ContextoDeLaHoja } from './contexto-de-la-hoja'
import { FaseDelItemInsignia } from './fase-del-item'

// Lo que se ofrece en una celda de catálogo: los activos y, aunque se haya desactivado, el valor que el ítem ya tiene (para no perder lo guardado).
function opcionesDeCatalogo(
  valores: readonly ValorDeLaHoja[],
  actual: string | null,
): OpcionDeCelda[] {
  return valores
    .filter((v) => v.activo || v.id === actual)
    .map((v) => ({ valor: v.id, etiqueta: v.activo ? v.nombre : `${v.nombre} (desactivado)` }))
}

export type ControlesDeItem = {
  descripcion: ReactNode
  tipoDePieza: ReactNode
  condicion: ReactNode
  pais: ReactNode
  via: ReactNode
  cantidad: ReactNode
  precio: ReactNode
  moneda: ReactNode
  tracking: ReactNode
  notas: ReactNode
  fase: ReactNode
  imagenes: ReactNode
  // Lo del hueco de la hoja (8.10-2); nulo sin hueco.
  hueco: ReactNode
  eliminar: ReactNode
}

const CATALOGOS = [
  ['tipoDePieza', 'tipo_pieza', 'tipo_pieza_id', 'tipoPiezaId', 'Tipo de pieza'],
  ['condicion', 'condicion', 'condicion_id', 'condicionId', 'Condición'],
  ['pais', 'pais_origen', 'pais_origen_id', 'paisOrigenId', 'País de origen'],
  ['via', 'modo_transporte', 'modo_transporte_id', 'modoTransporteId', 'Vía de transporte'],
] as const satisfies readonly [
  keyof ControlesDeItem,
  ClaveDeCatalogoDeLaHoja,
  ColumnaEditable,
  keyof FilaDeItem,
  string,
][]

type Parte = Pick<ControlesDeItem, 'tipoDePieza' | 'condicion' | 'pais' | 'via'>
const de = (fila: FilaDeItem, columna: string) => `${columna} del ítem ${fila.descripcion}`
const errorDe = (fila: FilaDeItem, c: ContextoDeLaHoja, columna: ColumnaEditable) =>
  c.errores[`${fila.id}:${columna}`]

function catalogosDeItem(fila: FilaDeItem, c: ContextoDeLaHoja): Parte {
  return Object.fromEntries(
    CATALOGOS.map(([nombre, catalogo, columna, campo, etiqueta]) => {
      const actual = fila[campo] as string | null
      return [
        nombre,
        <CeldaDeSeleccion
          key={nombre}
          etiqueta={de(fila, etiqueta)}
          columna={columna}
          valor={actual}
          opciones={opcionesDeCatalogo(c.catalogos[catalogo].valores, actual)}
          vacio="Sin definir"
          editable={c.editable}
          error={errorDe(fila, c, columna)}
          alGuardar={(valor) => c.guardar(fila.id, columna, valor)}
        />,
      ]
    }),
  ) as Parte
}

const TEXTOS = {
  descripcion: { etiqueta: 'Descripción', maximo: LARGO_MAXIMO_DE_DESCRIPCION },
  tracking: { etiqueta: 'Tracking', maximo: LARGO_MAXIMO_DE_TRACKING },
  notas: { etiqueta: 'Notas', maximo: LARGO_MAXIMO_DE_NOTAS_DEL_ITEM },
} as const

function textoDeItem(fila: FilaDeItem, c: ContextoDeLaHoja, columna: keyof typeof TEXTOS) {
  const { etiqueta, maximo } = TEXTOS[columna]
  return (
    <CeldaDeTexto
      etiqueta={de(fila, etiqueta)}
      columna={columna}
      valor={fila[columna]}
      editable={c.editable}
      maximo={maximo}
      error={errorDe(fila, c, columna)}
      alGuardar={(valor) => c.guardar(fila.id, columna, valor)}
    />
  )
}

function cantidadDeItem(fila: FilaDeItem, c: ContextoDeLaHoja) {
  return c.editable ? (
    <XCell
      id={`${fila.id}:cantidad`}
      label="Cantidad"
      format="numero"
      decimals={0}
      value={fila.cantidad}
      suggested={false}
      overridden={false}
      error={errorDe(fila, c, 'cantidad')}
      onCommit={c.alConfirmarNumero}
      onReset={c.alReiniciar}
    />
  ) : (
    <span className="tabular-nums">{fila.cantidad}</span>
  )
}

function precioDeItem(fila: FilaDeItem, c: ContextoDeLaHoja) {
  const moneda = fila.moneda ?? c.monedaPorDefecto
  if (c.editable) {
    return (
      <XCell
        id={`${fila.id}:precio_cliente`}
        label="Precio al cliente"
        format="monto"
        currency={moneda ?? undefined}
        value={fila.precioCliente}
        suggested={false}
        overridden={false}
        error={errorDe(fila, c, 'precio_cliente')}
        onCommit={c.alConfirmarNumero}
        onReset={c.alReiniciar}
      />
    )
  }
  return fila.precioCliente === null ? (
    <span className="text-(--color-ink-faint)">—</span>
  ) : (
    <Monto valor={fila.precioCliente} {...(moneda ? { moneda } : {})} />
  )
}

function monedaDeItem(fila: FilaDeItem, c: ContextoDeLaHoja) {
  const opciones: OpcionDeCelda[] = c.monedas.map((m) => ({ valor: m.codigo, etiqueta: m.codigo }))
  if (fila.moneda !== null && !c.monedas.some((m) => m.codigo === fila.moneda)) {
    opciones.push({ valor: fila.moneda, etiqueta: `${fila.moneda} (desactivada)` })
  }
  return (
    <CeldaDeSeleccion
      etiqueta={de(fila, 'Moneda')}
      columna="moneda"
      valor={fila.moneda}
      opciones={opciones}
      {...(fila.precioCliente === null ? { vacio: '—' } : {})}
      editable={c.editable}
      error={errorDe(fila, c, 'moneda')}
      alGuardar={(valor) => c.guardar(fila.id, 'moneda', valor)}
    />
  )
}

// «Imágenes» está en toda fila, también para quien sólo ve (8.09-3, C14, D70): el panel decide qué deja hacer.
function imagenesDeItem(fila: FilaDeItem, c: ContextoDeLaHoja) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      data-imagenes-item={fila.id}
      aria-label={`Imágenes del ítem ${fila.descripcion}`}
      className="min-h-11 md:min-h-9"
      onClick={() => {
        c.alPedirImagenes(fila.id)
      }}
    >
      <ImageIcon aria-hidden />
      Imágenes
    </Button>
  )
}

function eliminarDeItem(fila: FilaDeItem, c: ContextoDeLaHoja) {
  return c.editable ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      data-eliminar-item={fila.id}
      aria-label={`Eliminar el ítem ${fila.descripcion}`}
      className="min-h-11 md:min-h-9"
      onClick={() => {
        c.alPedirEliminar(fila.id)
      }}
    >
      <Trash2Icon aria-hidden />
      Eliminar
    </Button>
  ) : null
}

// Los controles de una fila de la hoja (8.09-2, C8), los mismos en la tabla y en la tarjeta: cada uno con su nombre accesible («Descripción del ítem Faro»). Con `repuestos.editar` y el proyecto abierto
// son editables; si no, texto plano, el precio por `<Monto>`. La fase es siempre de lectura (se mueve en 8.13).
export function controlesDeItem(fila: FilaDeItem, c: ContextoDeLaHoja): ControlesDeItem {
  return {
    descripcion: textoDeItem(fila, c, 'descripcion'),
    ...catalogosDeItem(fila, c),
    cantidad: cantidadDeItem(fila, c),
    precio: precioDeItem(fila, c),
    moneda: monedaDeItem(fila, c),
    tracking: textoDeItem(fila, c, 'tracking'),
    notas: textoDeItem(fila, c, 'notas'),
    fase: <FaseDelItemInsignia fase={fila.fase} />,
    imagenes: imagenesDeItem(fila, c),
    hueco: c.accionDeFila ? c.accionDeFila(fila) : null,
    eliminar: eliminarDeItem(fila, c),
  }
}
