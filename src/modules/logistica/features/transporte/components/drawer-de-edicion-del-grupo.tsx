'use client'

import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { focoDeQuienAbrio } from '@/shared/ui/foco-de-quien-abre'
import { puedeEditarElGrupo } from '../../../entities/transporte/edicion-del-grupo'
import type { GrupoLeido } from '../../../entities/transporte/grupos'
import type { ElementoDeOferta } from '../../../entities/transporte/oferta'
import { usePanelDelGrupo } from '../hooks/use-panel-del-grupo'
import { FormularioDelGrupo } from './formulario-del-grupo'

type Props = {
  grupo: GrupoLeido
  navieras: readonly ElementoDeOferta[]
  puertos: readonly ElementoDeOferta[]
  // El `?booking=` o `?contenedor=` de la página (lo pone `src/app`).
  claveDeUrl: string
}

// El drawer de «Editar grupo» (`?panel=editar-grupo`): tapa al resumen (D36). Cancelar y cerrar vuelven al resumen con la clave de ahora; guardar, con la que devuelve la base. Si el grupo no se
// puede editar desde aquí (una URL escrita a mano, o el grupo cambió) dice el motivo en vez de los campos (D37). El contrato de cierre con algo escrito es de `<Drawer>` y `useCambiosSinGuardar`.
export function DrawerDeEdicionDelGrupo({ grupo, navieras, puertos, claveDeUrl }: Props) {
  const panel = usePanelDelGrupo(claveDeUrl)
  const decision = puedeEditarElGrupo(grupo)
  function volver(clave: string) {
    panel.abrirResumen(clave)
  }
  return (
    <Drawer
      abierto
      alCerrar={() => {
        volver(grupo.clave)
      }}
      titulo={`Editar el ${grupo.tipo === 'contenedor' ? 'contenedor' : 'embarque'} ${grupo.clave}`}
      descripcion="Lo que cambies se aplica a todas las unidades del grupo."
      ancho="amplio"
      focoAlCerrar={focoDeQuienAbrio}
    >
      {decision.puede ? (
        <FormularioDelGrupo grupo={grupo} navieras={navieras} puertos={puertos} alVolver={volver} />
      ) : (
        <div className="grid gap-3" data-estado="no-editable">
          <p className="text-(--color-ink-soft)">{decision.motivo}</p>
          <div>
            <Button
              variant="outline"
              className="min-h-11 md:min-h-9"
              onClick={() => {
                volver(grupo.clave)
              }}
            >
              Volver al resumen
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  )
}
