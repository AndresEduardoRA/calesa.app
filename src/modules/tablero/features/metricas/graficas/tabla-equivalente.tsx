import { formatearNumero } from '@/shared/lib/formato'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'

export type FilaDeTabla = { clave: string; etiqueta: string; a: number; b: number }

type Props = {
  titulo: string
  // La cabecera de la primera columna: «Día», «Origen» o «Persona».
  primera: string
  columnas: readonly [string, string]
  filas: readonly FilaDeTabla[]
}

// «Ver como tabla»: los mismos números de la gráfica, todos, en una tabla. Un `<details>` nativo: sin JS ni estado, cerrado por
// defecto. Hasta 90 días son 90 filas: el contenedor tiene alto máximo y desplaza.
export function TablaEquivalente({ titulo, primera, columnas, filas }: Props) {
  return (
    <details className="group">
      <summary className="w-fit cursor-pointer rounded-sm text-(length:--text-sm) text-(--color-primario) underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-primario)">
        Ver como tabla
      </summary>
      <div className="mt-2 max-h-72 overflow-auto rounded-(--radius-card) border border-(--color-line)">
        <Table>
          <TableCaption className="sr-only">{titulo}: datos de la gráfica</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{primera}</TableHead>
              <TableHead scope="col" className="text-right">
                {columnas[0]}
              </TableHead>
              <TableHead scope="col" className="text-right">
                {columnas[1]}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((fila) => (
              <TableRow key={fila.clave}>
                <TableCell>{fila.etiqueta}</TableCell>
                <TableCell className="text-right tabular-nums">{formatearNumero(fila.a)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatearNumero(fila.b)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </details>
  )
}
