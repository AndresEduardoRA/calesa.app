'use client'

import { cn } from 'cn'
import { Badge } from '../badge'
import { IconoDelCatalogo } from '../icono-del-catalogo/icono-del-catalogo'
import {
  AbrirResumen,
  CabeceraPegada,
  CeldaPegada,
  FilaDeLista,
  MasAcciones,
  TablaDeLista,
  TarjetaDeLista,
  UnaSolaVista,
} from '../lista'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '../table'
import { BotonesDeOrden } from './botones-de-orden'
import type { Direccion, FilaDeCatalogo } from './tipos'

type Props = {
  filas: readonly FilaDeCatalogo[]
  // Distingue los ids de los botones de orden y del «⋯» entre una pestaña y otra.
  prefijo: string
  // Qué dice la columna de uso: «Leads», «Seguimientos».
  columnaDeUso: string
  // Qué abre un clic en la fila (o Enter sobre su nombre): editarla.
  alAbrir: (id: string) => void
  alMover: (id: string, direccion: Direccion) => void
}

// Los textos de estado: una fila apagada se sigue nombrando, con «Desactivado»: sus datos la conservan pero no se ofrece en lo nuevo.
const ESTADO_ACTIVO = 'Activo'

function Nombre({ fila, clases }: { fila: FilaDeCatalogo; clases?: string }) {
  return (
    <AbrirResumen nombre={fila.nombre} className={cn('max-w-72 min-w-0 truncate', clases)}>
      {fila.nombre}
    </AbrirResumen>
  )
}

function Insignias({ fila }: { fila: FilaDeCatalogo }) {
  return (
    <>
      {fila.insignias.map((texto) => (
        <Badge key={texto} variant="secondary">
          {texto}
        </Badge>
      ))}
      {fila.activo ? null : <Badge variant="outline">Desactivado</Badge>}
    </>
  )
}

function Tabla({ filas, prefijo, columnaDeUso, alAbrir, alMover }: Props) {
  return (
    <TablaDeLista>
      <TableHeader>
        <TableRow>
          <CabeceraPegada lado="nombre">Nombre</CabeceraPegada>
          <TableHead>Orden</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>{columnaDeUso}</TableHead>
          <CabeceraPegada lado="acciones">
            <span className="sr-only">Acciones</span>
          </CabeceraPegada>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((fila) => (
          <FilaDeLista
            key={fila.id}
            alAbrir={() => {
              alAbrir(fila.id)
            }}
          >
            <CeldaPegada lado="nombre">
              <span className="flex min-w-0 items-center gap-2">
                <IconoDelCatalogo clave={fila.icono} className="text-(--color-ink-soft)" />
                <Nombre fila={fila} clases={fila.activo ? undefined : 'text-(--color-ink-soft)'} />
                <Insignias fila={fila} />
              </span>
            </CeldaPegada>
            <TableCell className="py-0">
              <BotonesDeOrden
                prefijo={prefijo}
                id={fila.id}
                nombre={fila.nombre}
                puedeSubir={fila.puedeSubir}
                puedeBajar={fila.puedeBajar}
                alMover={(direccion) => {
                  alMover(fila.id, direccion)
                }}
              />
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {fila.activo ? ESTADO_ACTIVO : 'No se ofrece en lo nuevo'}
            </TableCell>
            <TableCell className="whitespace-nowrap text-(--color-ink-soft)">{fila.uso}</TableCell>
            <CeldaPegada lado="acciones">
              <MasAcciones
                nombre={fila.nombre}
                acciones={fila.acciones}
                id={`${prefijo}-${fila.id}-mas`}
              />
            </CeldaPegada>
          </FilaDeLista>
        ))}
      </TableBody>
    </TablaDeLista>
  )
}

function Tarjetas({ filas, prefijo, alAbrir, alMover }: Props) {
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {filas.map((fila) => (
        <TarjetaDeLista
          key={fila.id}
          alAbrir={() => {
            alAbrir(fila.id)
          }}
          acciones={
            <MasAcciones
              nombre={fila.nombre}
              acciones={fila.acciones}
              id={`${prefijo}-${fila.id}-mas`}
            />
          }
        >
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <IconoDelCatalogo clave={fila.icono} className="text-(--color-ink-soft)" />
            <Nombre
              fila={fila}
              clases={cn(
                'text-(length:--text-base) font-medium',
                fila.activo ? 'text-(--color-ink)' : 'text-(--color-ink-soft)',
              )}
            />
            <Insignias fila={fila} />
          </div>
          <p className="text-(length:--text-sm) text-(--color-ink-faint)">
            {fila.activo ? ESTADO_ACTIVO : 'No se ofrece en lo nuevo'} · {fila.uso}
          </p>
          <BotonesDeOrden
            prefijo={prefijo}
            id={fila.id}
            nombre={fila.nombre}
            puedeSubir={fila.puedeSubir}
            puedeBajar={fila.puedeBajar}
            alMover={(direccion) => {
              alMover(fila.id, direccion)
            }}
          />
        </TarjetaDeLista>
      ))}
    </ul>
  )
}

// La lista de un catálogo configurable con el patrón de lista (`@/shared/ui/lista`): una sola vista elegida en el servidor —la tabla desde
// 768 px, tarjetas por debajo—, con el nombre y el «⋯» a la vista aunque la tabla se desplace; un clic en cualquier parte de la fila abre su
// edición. «Subir» y «Bajar» (con el teclado, sin arrastrar) están a la vista; lo demás —activar, el «por defecto», editar y eliminar— va
// en el «⋯», con el motivo cuando una acción no se puede. Sin `<Switch>`: el estado se dice con texto y se cambia desde el menú.
export function ListaDeCatalogo(props: Props) {
  return (
    <UnaSolaVista tabla={() => <Tabla {...props} />} tarjetas={() => <Tarjetas {...props} />} />
  )
}
