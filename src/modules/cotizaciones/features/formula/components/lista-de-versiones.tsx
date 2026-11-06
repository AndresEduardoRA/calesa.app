'use client'

import { textoDelTope } from '@/shared/lib/conteo'
import { fechaRelativa } from '@/shared/lib/fechas'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import type { VersionParaRevertir } from '../../../entities/formula/reversion'
import type { PaginaConAutores, VersionDeLaFormula } from '../../../entities/formula/versiones'
import { usePaginasDeVersiones, type PaginasDeVersiones } from '../hooks/use-paginas-de-versiones'
import { IrALaVersion } from './ir-a-la-version'

type Props = {
  origenId: string
  // La primera página, leída en el servidor.
  inicial: PaginaConAutores
  // Sin publicada no hay a qué revertir: no se ofrece.
  conPublicada?: boolean
  // Abre «Revertir a la versión N» con su fila (la de cualquier página). Sin él, la lista sólo se lee.
  alRevertir?: (version: VersionParaRevertir) => void
}

// Las versiones publicadas y archivadas del origen, de la más nueva a la más vieja: «Publicada» en la vigente, su nota y quién la publicó y cuándo. Cada archivada
// lleva «Revertir» (4.20-2b) si el origen tiene publicada.
export function ListaDeVersiones({ origenId, inicial, conPublicada = false, alRevertir }: Props) {
  const { zonaHoraria } = useRegional()
  const versiones = usePaginasDeVersiones(origenId, inicial)
  return (
    <section aria-labelledby="titulo-versiones" className="grid min-w-0 gap-2">
      <h3
        id="titulo-versiones"
        className="text-(length:--text-base) font-semibold text-(--color-ink)"
      >
        Versiones
      </h3>
      {versiones.desde !== null ? (
        <div className="flex flex-wrap items-center gap-2 text-(length:--text-sm) text-(--color-ink-soft)">
          <p role="status">Desde la versión {versiones.desde}.</p>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-9"
            onClick={versiones.volverALaMasNueva}
          >
            Volver a la más nueva
          </Button>
        </div>
      ) : null}
      {versiones.filas.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {versiones.desde !== null
            ? `No hay versiones desde la ${versiones.desde}.`
            : 'Todavía no hay versiones.'}
        </p>
      ) : (
        <ol aria-label="Versiones de la fórmula" className="grid grid-cols-[minmax(0,1fr)] gap-1">
          {versiones.filas.map((version) => (
            <li
              key={version.id}
              className="grid gap-0.5 rounded-(--radius-md) p-2 text-(length:--text-sm) text-(--color-ink)"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">Versión {version.version}</span>
                {version.estado === 'publicada' ? <Badge>Publicada</Badge> : null}
              </div>
              <p className="break-words">{version.nota ?? 'Sin nota.'}</p>
              <p className="text-(--color-ink-soft)">
                {version.autor}
                {version.publicadoEn
                  ? ` · ${fechaRelativa(version.publicadoEn, { zona: zonaHoraria })}`
                  : null}
              </p>
              {alRevertir && conPublicada && version.estado === 'archivada' ? (
                <BotonDeRevertir version={version} alRevertir={alRevertir} />
              ) : null}
            </li>
          ))}
        </ol>
      )}
      <PieDeLasVersiones versiones={versiones} />
    </section>
  )
}

function BotonDeRevertir({
  version,
  alRevertir,
}: {
  version: VersionDeLaFormula
  alRevertir: (version: VersionParaRevertir) => void
}) {
  const n = String(version.version)
  return (
    <Button
      type="button"
      variant="outline"
      className="mt-1 min-h-11 justify-self-start md:min-h-9"
      aria-label={`Revertir a la versión ${n}`}
      onClick={() => {
        alRevertir({ id: version.id, version: version.version })
      }}
    >
      Revertir
    </Button>
  )
}

// Debajo: el error del último pedido, el tope con «Ir a la versión», o «Ver más».
function PieDeLasVersiones({ versiones }: { versiones: PaginasDeVersiones }) {
  if (versiones.error) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2">
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          No se pudieron cargar más versiones.
        </p>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          onClick={versiones.reintentar}
        >
          Reintentar
        </Button>
      </div>
    )
  }
  return (
    <>
      {versiones.enElTope ? (
        <AvisoDeTope texto={textoDelTope(TOPE_DE_LO_CARGADO, { articulo: 'las' })} />
      ) : null}
      {versiones.hayMasParaPedir ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 justify-self-start md:min-h-9"
          disabled={versiones.cargando}
          onClick={versiones.verMas}
        >
          {versiones.cargando ? 'Cargando…' : 'Ver más'}
        </Button>
      ) : null}
      {versiones.enElTope || versiones.desde !== null ? (
        <IrALaVersion alIr={versiones.irA} deshabilitado={versiones.cargando} />
      ) : null}
    </>
  )
}
