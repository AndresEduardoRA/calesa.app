'use client'

import { Button } from '@/shared/ui/button'
import { EsqueletoListado } from '@/shared/ui/esqueletos'
import { EstadoError } from '@/shared/ui/estados'
import { useLecturaDeLaDefinicion } from '../../hooks/use-lectura-de-la-definicion'
import { ListaDeFilas } from './lista-de-filas'

type Props = {
  origen: { id: string; nombre: string }
  // La versión que se edita: la del borrador o, sin él, la publicada.
  formulaId: string
  // «Sobre el borrador de <persona>.» o «Sobre la versión N publicada.»
  sobre: string
  alVolver: () => void
}

// El editor de la fórmula en texto (4.21-3a-1, `?panel=editar-formula`): lee la versión desde el navegador al abrirse y dibuja sus filas. Nada se guarda en la base
// (guardar el borrador es del 4.21-3b): lo aplicado vive en la pestaña.
export function EditorDeLaFormula({ origen, formulaId, sobre, alVolver }: Props) {
  const { estado, reintentar } = useLecturaDeLaDefinicion(formulaId)
  return (
    <section aria-label="Editor de la fórmula" className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid min-w-0 gap-0.5">
          <h3 className="font-semibold text-(--color-ink)">Editar la fórmula de {origen.nombre}</h3>
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">{sobre}</p>
        </div>
        <Button type="button" variant="outline" className="min-h-11 md:min-h-9" onClick={alVolver}>
          Volver a la fórmula
        </Button>
      </div>
      {estado.tipo === 'leyendo' ? <EsqueletoListado filas={8} columnas={2} /> : null}
      {estado.tipo === 'error' ? <EstadoError alReintentar={reintentar} /> : null}
      {estado.tipo === 'no_esta' ? (
        <p className="rounded-(--radius-md) bg-(--color-aviso-soft) p-2 text-(length:--text-sm) text-(--color-aviso-ink)">
          Esa versión de la fórmula ya no se puede abrir: se descartó o ya no configuras{' '}
          {origen.nombre}.
        </p>
      ) : null}
      {estado.tipo === 'lista' ? (
        <ListaDeFilas origenId={origen.id} nombreDelOrigen={origen.nombre} leida={estado.leida} />
      ) : null}
    </section>
  )
}
