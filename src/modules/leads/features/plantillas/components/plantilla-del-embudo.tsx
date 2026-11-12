'use client'

import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Button } from '@/shared/ui/button'
import { Confirmar } from '@/shared/ui/confirmar'
import type { AjustesDeLeads } from '../../../entities/ajustes-de-leads'
import { ListaDeEtapas } from '../../embudo/components/lista-de-etapas'
import { usePlantillaDelEmbudo } from '../hooks/use-plantilla-del-embudo'
import { useRestablecerPlantillaDelEmbudo } from '../hooks/use-restablecer-plantilla-del-embudo'
import { RechazoAlRestablecer } from './rechazo-al-restablecer'

// Configuración › Leads › «Plantilla del embudo» (`?seccion=embudo`): las etapas con que nace el embudo de cada persona. Quien la monta
// le da la versión como `key`: lo guardado, acá o por otra persona, vuelve a montarla desde la base.
export function PlantillaDelEmbudo({ embudo }: { embudo: AjustesDeLeads['embudo'] }) {
  const plantilla = usePlantillaDelEmbudo(embudo)
  const restablecimiento = useRestablecerPlantillaDelEmbudo(embudo)
  return (
    <section aria-label="Plantilla del embudo" className="grid gap-4">
      {embudo.deFabrica ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Son las etapas de fábrica: nadie cambió la plantilla todavía.
        </p>
      ) : null}
      <form
        className="grid gap-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          void plantilla.enviar()
        }}
      >
        {plantilla.conflicto ? (
          <AvisoDeConflicto mensaje={plantilla.conflicto} alRecargar={plantilla.recargar} />
        ) : null}
        {plantilla.error ? (
          <Aviso tono="peligro">
            <p>{plantilla.error}</p>
          </Aviso>
        ) : null}
        <ListaDeEtapas panel={plantilla} />
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            className="min-h-11 md:min-h-9"
            disabled={!plantilla.hayCambios || plantilla.enCurso}
          >
            {plantilla.enCurso ? 'Guardando…' : 'Guardar'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-9"
            disabled={embudo.deFabrica || plantilla.enCurso || restablecimiento.enCurso}
            onClick={restablecimiento.abrir}
          >
            Restablecer
          </Button>
        </div>
      </form>
      <Confirmar
        abierto={restablecimiento.abierto}
        alCerrar={restablecimiento.cerrar}
        alConfirmar={restablecimiento.confirmar}
        titulo="Restablecer la plantilla del embudo"
        descripcion="Vuelven las etapas de fábrica y se pierden las de la plantilla. Los embudos que ya existen no cambian."
        etiquetaConfirmar="Restablecer"
        enCurso={restablecimiento.enCurso}
      >
        <RechazoAlRestablecer
          rechazo={restablecimiento.rechazo}
          alRecargar={restablecimiento.recargar}
        />
      </Confirmar>
    </section>
  )
}
