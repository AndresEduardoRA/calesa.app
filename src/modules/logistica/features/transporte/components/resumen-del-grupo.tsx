import type { HuecoDelGrupo as Hueco } from '../../../entities/nucleo/grupo'
import { textoDeUnidades, type GrupoLeido } from '../../../entities/transporte/grupos'
import { tipoDeGrupoDeLaVista, type VistaDeGrupos } from '../../../entities/transporte/paneles'
import { HuecoDelGrupo } from './hueco-del-grupo'
import type { CatalogosParaNombrar } from './tipos-de-la-lista'
import { UnidadesDelGrupo } from './unidades-del-grupo'

type Props = {
  grupo: GrupoLeido
  vista: VistaDeGrupos
  catalogos: CatalogosParaNombrar
  // Los huecos que se dibujan, ya filtrados y en orden: el resumen no decide permisos (lo hace `src/app`).
  huecos: readonly Hueco[]
}

// El resumen de un grupo (6.08-3): su clave, cuántas unidades ve quien mira, las unidades con su fase y su ETA y, debajo, un bloque plegado por hueco (mover, documentos y gastos del
// grupo). No lee nada y no escribe nada por sí mismo: «Editar grupo» llega en 6.08-4. Sin unidades visibles no hay huecos: la clave que no existe y la que no se ve dicen lo mismo.
export function ResumenDelGrupo({ grupo, vista, catalogos, huecos }: Props) {
  const que = vista === 'contenedores' ? 'contenedor' : 'embarque'
  const titulo = vista === 'contenedores' ? 'Contenedor' : 'Embarque'
  const vacio = grupo.unidades.length === 0
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5" data-slot="resumen-del-grupo">
      <header className="grid min-w-0 gap-1">
        <h2 className="text-(length:--text-xl) font-semibold [overflow-wrap:anywhere] text-(--color-ink)">
          {titulo} {grupo.clave}
        </h2>
        {vacio ? null : (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            {textoDeUnidades(grupo.unidades.length, grupo.hayMas)}
          </p>
        )}
        {grupo.hayMas ? (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            Hay más unidades de las que se muestran.
          </p>
        ) : null}
        {grupo.hayOcultas && !vacio ? (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            Hay unidades que no ves.
          </p>
        ) : null}
      </header>
      {vacio ? (
        <p className="text-(--color-ink-soft)">Este {que} no tiene unidades que puedas ver.</p>
      ) : (
        <>
          <UnidadesDelGrupo unidades={grupo.unidades} catalogos={catalogos} />
          {huecos.length > 0 ? (
            <div className="grid gap-3">
              {huecos.map((hueco) => (
                <HuecoDelGrupo key={hueco.clave} titulo={hueco.titulo}>
                  <hueco.componente
                    grupo={{ tipo: tipoDeGrupoDeLaVista(vista), id: grupo.clave }}
                  />
                </HuecoDelGrupo>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
