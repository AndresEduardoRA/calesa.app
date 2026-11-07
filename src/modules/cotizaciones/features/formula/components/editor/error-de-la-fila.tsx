'use client'

import type { ErrorDeFila } from '../../../../entities/formula/compilar-fila'
import type { FilaParaDibujar } from '../../hooks/use-editor-de-la-formula.soporte'
import { ValorDeConstante } from './valor-de-constante'

type Props = {
  // El id que el texto nombra en `aria-describedby`.
  id: string
  error: ErrorDeFila
  formatos: FilaParaDibujar['formatos']
}

// Por qué no se aplicó el texto de una fila (C6), debajo de él: el mensaje de `compilarFila()` (el compilador, el sitio, el de 2.001 caracteres —4-6—, una
// auxiliar que otra fila nombra) y, con `pisa_un_valor` (4-5), una línea por valor del ⚙ que se pisaría.
export function ErrorDeLaFila({ id, error, formatos }: Props) {
  return (
    <div id={id} role="alert" className="grid gap-1 text-(--color-peligro-ink)">
      <p>{error.mensaje}</p>
      {error.codigo === 'pisa_un_valor'
        ? error.cambios.map((cambio) => (
            <p key={cambio.id} className="text-(--color-ink)">
              <code>{cambio.id}</code>:{' '}
              <ValorDeConstante valor={cambio.guardado} formato={formatos[cambio.id]} />
              {cambio.nuevo === null ? (
                ' se quita'
              ) : (
                <>
                  {' → '}
                  <ValorDeConstante valor={cambio.nuevo} formato={formatos[cambio.id]} />
                </>
              )}
            </p>
          ))
        : null}
    </div>
  )
}
