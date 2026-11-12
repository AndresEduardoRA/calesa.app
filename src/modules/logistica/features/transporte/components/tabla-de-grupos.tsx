'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import {
  AbrirResumen,
  CabeceraPegada,
  CeldaPegada,
  FilaDeLista,
  TablaDeLista,
} from '@/shared/ui/lista'
import { useRegional } from '@/shared/ui/regional'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { textosDelGrupo, type GrupoDeTransporte } from '../../../entities/transporte/grupos'
import type { PropsDeLaFila } from './tipos-de-la-lista'
import { ValorDelGrupo } from './valor-del-grupo'

type Props = PropsDeLaFila & { grupos: readonly GrupoDeTransporte[] }

// Los grupos de la página en escritorio, con el patrón de lista: la clave es el botón de la fila y abre el resumen. Sin «⋯»: en 6.08-3 la lista sólo lee.
export function TablaDeGrupos({ grupos, vista, catalogos, alAbrir, abierto }: Props) {
  const { zonaHoraria } = useRegional()
  const fecha = (iso: string) => formatearFecha(iso, { zona: zonaHoraria })
  const que = vista === 'contenedores' ? 'el contenedor' : 'el embarque'
  return (
    <TablaDeLista>
      <TableHeader>
        <TableRow>
          <CabeceraPegada lado="nombre">
            {vista === 'contenedores' ? 'Contenedor' : 'Embarque'}
          </CabeceraPegada>
          <TableHead>Naviera</TableHead>
          <TableHead>Ruta</TableHead>
          <TableHead>Zarpe</TableHead>
          <TableHead>ETA</TableHead>
          <TableHead>Arribo</TableHead>
          <TableHead>Unidades</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {grupos.map((grupo) => {
          const t = textosDelGrupo(grupo, catalogos, fecha)
          return (
            <FilaDeLista
              key={grupo.clave}
              abierta={abierto === grupo.clave}
              alAbrir={() => {
                alAbrir(grupo.clave)
              }}
            >
              <CeldaPegada lado="nombre">
                <AbrirResumen
                  nombre={`${que} ${grupo.clave}`}
                  className="max-w-60 truncate font-medium text-(--color-ink)"
                >
                  {grupo.clave}
                </AbrirResumen>
              </CeldaPegada>
              <TableCell className="max-w-40 truncate">
                <ValorDelGrupo texto={t.naviera} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <ValorDelGrupo texto={t.ruta} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <ValorDelGrupo texto={t.zarpe} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <ValorDelGrupo texto={t.eta} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <ValorDelGrupo texto={t.arribo} />
              </TableCell>
              <TableCell>
                <span className="whitespace-nowrap">{t.unidades}</span>
                {grupo.hayOcultas ? (
                  <span className="block text-(length:--text-xs) text-(--color-ink-soft)">
                    Hay unidades que no ves.
                  </span>
                ) : null}
              </TableCell>
            </FilaDeLista>
          )
        })}
      </TableBody>
    </TablaDeLista>
  )
}
