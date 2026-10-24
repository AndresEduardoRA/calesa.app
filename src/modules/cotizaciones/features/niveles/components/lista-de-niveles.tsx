'use client'

import { cn } from 'cn'
import { formatearFecha } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import {
  AbrirResumen,
  CabeceraPegada,
  CeldaPegada,
  FilaDeLista,
  MasAcciones,
  TablaDeLista,
  TarjetaDeLista,
  UnaSolaVista,
  type AccionDeMenu,
} from '@/shared/ui/lista'
import { useRegional } from '@/shared/ui/regional'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { esNivelFijo, type NivelDeAcceso } from '../../../entities/nivel'

// Una fila de la lista: el nivel, las líneas de su «⋯» (ninguna = sin «⋯») y qué abre un clic en la fila (nada = no promete un clic que no hace nada).
export type FilaDeNivel = {
  nivel: NivelDeAcceso
  acciones: readonly AccionDeMenu[]
  alAbrir: (() => void) | null
}

type Props = {
  filas: readonly FilaDeNivel[]
  // Distingue los ids del «⋯» de cada fila.
  prefijo: string
  // Si alguna fila puede cambiarse: sólo entonces hay columna de acciones.
  conAcciones: boolean
}

function estadoDe(nivel: NivelDeAcceso, zona: string): string {
  if (nivel.retiradoEn !== null) {
    return `Retirado el ${formatearFecha(nivel.retiradoEn, { zona })}`
  }
  return esNivelFijo(nivel) ? 'No se cambia' : 'Se ofrece en las hojas'
}

// Si alguna hoja lo nombra. La explicación entera (cuántas celdas de cuántos orígenes) la da la base y está en el «⋯», junto a «Eliminar».
function usoDe(nivel: NivelDeAcceso): string {
  if (esNivelFijo(nivel)) {
    return 'Lo ve quien ve la cotización'
  }
  return nivel.motivoDeUso === null ? 'Sin uso' : 'En uso'
}

function Nombre({ fila, clases }: { fila: FilaDeNivel; clases?: string }) {
  const { nivel, alAbrir } = fila
  return alAbrir ? (
    <AbrirResumen nombre={nivel.nombre} className={cn('max-w-72 min-w-0 truncate', clases)}>
      {nivel.nombre}
    </AbrirResumen>
  ) : (
    <span title={nivel.nombre} className={cn('max-w-72 min-w-0 truncate', clases)}>
      {nivel.nombre}
    </span>
  )
}

function Insignia({ nivel }: { nivel: NivelDeAcceso }) {
  return nivel.retiradoEn === null ? null : <Badge variant="outline">Retirado</Badge>
}

function Tabla({ filas, prefijo, conAcciones }: Props) {
  const { zonaHoraria } = useRegional()
  return (
    <TablaDeLista>
      <TableHeader>
        <TableRow>
          <CabeceraPegada lado="nombre">Nombre</CabeceraPegada>
          <TableHead>Estado</TableHead>
          <TableHead>Uso</TableHead>
          {conAcciones ? (
            <CabeceraPegada lado="acciones">
              <span className="sr-only">Acciones</span>
            </CabeceraPegada>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((fila) => (
          <FilaDeLista key={fila.nivel.id} alAbrir={fila.alAbrir ?? undefined}>
            <CeldaPegada lado="nombre">
              <span className="flex min-w-0 items-center gap-2">
                <Nombre
                  fila={fila}
                  clases={fila.nivel.retiradoEn ? 'text-(--color-ink-soft)' : undefined}
                />
                <Insignia nivel={fila.nivel} />
              </span>
            </CeldaPegada>
            <TableCell className="whitespace-nowrap">{estadoDe(fila.nivel, zonaHoraria)}</TableCell>
            <TableCell className="whitespace-nowrap text-(--color-ink-soft)">
              {usoDe(fila.nivel)}
            </TableCell>
            {conAcciones ? (
              <CeldaPegada lado="acciones">
                {fila.acciones.length > 0 ? (
                  <MasAcciones
                    nombre={fila.nivel.nombre}
                    acciones={fila.acciones}
                    id={`${prefijo}-${fila.nivel.id}-mas`}
                  />
                ) : null}
              </CeldaPegada>
            ) : null}
          </FilaDeLista>
        ))}
      </TableBody>
    </TablaDeLista>
  )
}

function Tarjetas({ filas, prefijo }: Props) {
  const { zonaHoraria } = useRegional()
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {filas.map((fila) => (
        <TarjetaDeLista
          key={fila.nivel.id}
          alAbrir={fila.alAbrir ?? undefined}
          acciones={
            fila.acciones.length > 0 ? (
              <MasAcciones
                nombre={fila.nivel.nombre}
                acciones={fila.acciones}
                id={`${prefijo}-${fila.nivel.id}-mas`}
              />
            ) : undefined
          }
        >
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <Nombre
              fila={fila}
              clases={cn(
                'text-(length:--text-base) font-medium',
                fila.nivel.retiradoEn ? 'text-(--color-ink-soft)' : 'text-(--color-ink)',
              )}
            />
            <Insignia nivel={fila.nivel} />
          </div>
          <p className="flex flex-wrap gap-x-1 text-(length:--text-sm) text-(--color-ink-faint)">
            <span>{estadoDe(fila.nivel, zonaHoraria)}</span>
            <span aria-hidden>·</span>
            <span>{usoDe(fila.nivel)}</span>
          </p>
        </TarjetaDeLista>
      ))}
    </ul>
  )
}

// Una lista de niveles con el patrón de lista (`@/shared/ui/lista`): una sola vista elegida en el servidor —la tabla desde 768 px, tarjetas por
// debajo—, con el nombre y el «⋯» a la vista aunque la tabla se desplace; un clic en una fila que se puede renombrar abre su renombre. Lo demás
// —retirar, restaurar y eliminar— va en el «⋯», con el motivo cuando una acción no se puede. Sin `<Switch>`: el estado se dice con texto.
export function ListaDeNiveles(props: Props) {
  return (
    <UnaSolaVista tabla={() => <Tabla {...props} />} tarjetas={() => <Tarjetas {...props} />} />
  )
}
