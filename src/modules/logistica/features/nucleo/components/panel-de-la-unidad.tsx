import type { Route } from 'next'
import Link from 'next/link'
import { BadgeDeSituacion } from '@/modules/vehiculos/client'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { textoDeDiasEnLaFase } from '../../../entities/nucleo/dias-en-la-fase'
import type { HuecoDeLaUnidad } from '../../../entities/nucleo/hueco'
import { esUnidadDeVehiculo, type UnidadAbierta } from '../../../entities/nucleo/unidad'
import { BloqueDelHueco } from './bloque-del-hueco'

type Props = {
  unidad: UnidadAbierta
  // El nombre del origen de la unidad.
  origen: string
  // La fase de la unidad (nombre y color); nula si no tiene.
  fase: { nombre: string; color: string } | null
  // Los huecos que se dibujan, ya filtrados y en orden (`huecosVisibles`): el panel no decide permisos.
  huecos: readonly HuecoDeLaUnidad[]
  // Una línea de aviso bajo la cabecera (p. ej. que no se pudo leer el flujo del origen).
  aviso?: string | null
}

// «Abrir ficha» para un vehículo; «Abrir proyecto» para un ítem (sin su proyecto, ningún enlace).
function EnlaceDeLaUnidad({ unidad }: { unidad: UnidadAbierta }) {
  const esItem = unidad.tipo === 'repuesto'
  if (esItem && unidad.proyecto === undefined) return null
  const href = esItem
    ? `${RUTAS.repuestos}/${unidad.proyecto?.id ?? ''}`
    : `${RUTAS.vehiculos}/${unidad.id}`
  return (
    <Link
      href={href as Route}
      className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-8' })}
    >
      {esItem ? 'Abrir proyecto' : 'Abrir ficha'}
    </Link>
  )
}

// Un vehículo dibuja el `componente` del hueco (las áreas que sólo tratan vehículos); un ítem, la `repuesto.componente` de su variante, y sin ella no dibuja nada.
function ContenidoDelHueco({ hueco, unidad }: { hueco: HuecoDeLaUnidad; unidad: UnidadAbierta }) {
  if (unidad.tipo === 'repuesto') {
    const Componente = hueco.repuesto?.componente
    return Componente === undefined ? null : <Componente unidad={unidad} />
  }
  return esUnidadDeVehiculo(unidad) ? <hueco.componente unidad={unidad} /> : null
}

// El panel de la unidad (6.01): la cabecera con el título, el origen, la fase y los días en ella, y debajo un bloque plegado por hueco. No lee nada: recibe lo que se dibuja. Sirve
// igual en la página de la unidad y dentro del drawer de la cadena. Un hueco recibe sólo `{ unidad }` (datos serializables) y carga lo suyo al abrirse.
export function PanelDeLaUnidad({ unidad, origen, fase, huecos, aviso = null }: Props) {
  const dias = textoDeDiasEnLaFase(unidad.faseDesde)
  return (
    <div className="grid gap-4" data-slot="panel-de-la-unidad">
      <header className="grid gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2
            tabIndex={-1}
            className="text-(length:--text-lg) font-semibold text-(--color-ink) outline-none focus-visible:shadow-(--shadow-focus)"
          >
            {unidad.titulo}
          </h2>
          <EnlaceDeLaUnidad unidad={unidad} />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-(length:--text-sm) text-(--color-ink-soft)">
          <span>{origen}</span>
          <BadgeDeSituacion situacion={unidad.situacion} fase={fase} />
          {dias ? <span>{dias}</span> : null}
        </div>
        {aviso ? <p className="text-(length:--text-sm) text-(--color-ink-soft)">{aviso}</p> : null}
      </header>
      {huecos.length > 0 ? (
        <div className="grid gap-3">
          {huecos.map((hueco) => (
            <BloqueDelHueco
              key={hueco.clave}
              clave={hueco.clave}
              titulo={hueco.titulo}
              abiertoAlInicio={hueco.abiertoAlInicio}
            >
              <ContenidoDelHueco hueco={hueco} unidad={unidad} />
            </BloqueDelHueco>
          ))}
        </div>
      ) : null}
    </div>
  )
}
