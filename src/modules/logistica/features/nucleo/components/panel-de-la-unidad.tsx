import type { Route } from 'next'
import Link from 'next/link'
import { BadgeDeFase } from '@/modules/vehiculos/client'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { textoDeDiasEnLaFase } from '../../../entities/nucleo/dias-en-la-fase'
import type { HuecoDeLaUnidad } from '../../../entities/nucleo/hueco'
import type { Unidad } from '../../../entities/nucleo/unidad'
import { BloqueDelHueco } from './bloque-del-hueco'

type Props = {
  unidad: Unidad
  // El nombre del origen de la unidad.
  origen: string
  // La fase de la unidad (nombre y color); nula si no tiene.
  fase: { nombre: string; color: string } | null
  // Los huecos que se dibujan, ya filtrados y en orden (`huecosVisibles`): el panel no decide permisos.
  huecos: readonly HuecoDeLaUnidad[]
  // Una línea de aviso bajo la cabecera (p. ej. que no se pudo leer el flujo del origen).
  aviso?: string | null
}

// El panel de la unidad (6.01): la cabecera con el título, el origen, la fase y los días en ella, y debajo un bloque plegado por hueco. No lee nada: recibe lo que se dibuja. Sirve
// igual en la página de la unidad y dentro del drawer de la cadena. Un hueco recibe sólo `{ unidad }` (datos serializables) y carga lo suyo al abrirse.
export function PanelDeLaUnidad({ unidad, origen, fase, huecos, aviso = null }: Props) {
  const dias = textoDeDiasEnLaFase(unidad.faseDesde)
  return (
    <div className="grid gap-4" data-slot="panel-de-la-unidad">
      <header className="grid gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-(length:--text-lg) font-semibold text-(--color-ink)">
            {unidad.titulo}
          </h2>
          <Link
            href={`${RUTAS.vehiculos}/${unidad.id}` as Route}
            className={buttonVariants({ variant: 'outline' })}
          >
            Abrir ficha
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-(length:--text-sm) text-(--color-ink-soft)">
          <span>{origen}</span>
          <BadgeDeFase fase={fase} />
          {dias ? <span>{dias}</span> : null}
        </div>
        {aviso ? <p className="text-(length:--text-sm) text-(--color-ink-soft)">{aviso}</p> : null}
      </header>
      {huecos.length > 0 ? (
        <div className="grid gap-3">
          {huecos.map((hueco) => (
            <BloqueDelHueco key={hueco.clave} titulo={hueco.titulo}>
              <hueco.componente unidad={unidad} />
            </BloqueDelHueco>
          ))}
        </div>
      ) : null}
    </div>
  )
}
