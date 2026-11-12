'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import {
  AbrirResumen,
  CabeceraPegada,
  CeldaPegada,
  FilaDeLista,
  TablaDeLista,
} from '@/shared/ui/lista'
import { useRegional } from '@/shared/ui/regional'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { textoDelCanal, type FilaDeDeclaracion } from '../../../entities/aduana/declaracion'
import { textoDeUnidades } from '../../../entities/aduana/estado'
import { EstadoDeTributos } from './estado-de-tributos'

type Props = {
  declaraciones: readonly FilaDeDeclaracion[]
  alAbrir: (id: string) => void
  abierta: string | null
}

const SIN_DATO = <span className="text-(--color-ink-faint)">—</span>

// Las declaraciones de la página en escritorio, con el patrón de lista: el número es el botón de la fila y abre el resumen (`?declaracion=`). Sin «⋯»: en 6.09-1 la lista sólo lee.
export function TablaDeDeclaraciones({ declaraciones, alAbrir, abierta }: Props) {
  const { zonaHoraria } = useRegional()
  return (
    <TablaDeLista>
      <TableHeader>
        <TableRow>
          <CabeceraPegada lado="nombre">Número</CabeceraPegada>
          <TableHead>Canal</TableHead>
          <TableHead>Aceptada</TableHead>
          <TableHead>Tributos</TableHead>
          <TableHead>Despachante</TableHead>
          <TableHead>Unidades</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {declaraciones.map((declaracion) => (
          <FilaDeLista
            key={declaracion.id}
            abierta={abierta === declaracion.id}
            alAbrir={() => {
              alAbrir(declaracion.id)
            }}
          >
            <CeldaPegada lado="nombre">
              <AbrirResumen
                nombre={`la declaración ${declaracion.numero}`}
                className="max-w-60 truncate font-medium text-(--color-ink)"
              >
                {declaracion.numero}
              </AbrirResumen>
            </CeldaPegada>
            <TableCell>
              <Badge variant="secondary">{textoDelCanal(declaracion.canal)}</Badge>
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {declaracion.aceptadaEl
                ? formatearFecha(declaracion.aceptadaEl, { zona: zonaHoraria })
                : SIN_DATO}
            </TableCell>
            <TableCell>
              <EstadoDeTributos {...declaracion} />
            </TableCell>
            <TableCell className="max-w-48 truncate">
              {declaracion.despachante ?? SIN_DATO}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {textoDeUnidades(declaracion.vehiculos)}
            </TableCell>
          </FilaDeLista>
        ))}
      </TableBody>
    </TablaDeLista>
  )
}
