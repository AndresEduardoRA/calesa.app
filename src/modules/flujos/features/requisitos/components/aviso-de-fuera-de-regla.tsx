'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import {
  PANEL_FUERA_DE_REGLA,
  textoDelAviso,
  type GrupoDelPanel,
} from '../../../entities/requisitos/fuera-de-regla'
import { PanelDeFueraDeReglaDiferido } from './diferidos'

type Props = {
  // Cuántas hay (hasta el tope) y si había más.
  n: number
  hayMas: boolean
  grupos: GrupoDelPanel[]
  // Los títulos de los vehículos no se pudieron leer.
  titulosFallaron: boolean
}

// «5 unidades fuera de regla» sobre la lista de fases, con «Ver cuáles» (`?panel=fuera-de-regla`). Las unidades no se mueven al volver bloqueante un
// requisito: quedan marcadas hasta que cumplan lo que falta. El panel se pide recién al abrirse.
export function AvisoDeFueraDeRegla({ n, hayMas, grupos, titulosFallaron }: Props) {
  const panel = usePanelPorUrl(PANEL_FUERA_DE_REGLA)
  const visto = useAbiertoAlgunaVez(panel.abierto)
  return (
    <>
      <Aviso tono="aviso">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{textoDelAviso({ n, hayMas })}</span>
          <Button variant="link" className="h-auto p-0" onClick={() => panel.abrir()}>
            Ver cuáles
          </Button>
        </span>
      </Aviso>
      {visto ? (
        <PanelDeFueraDeReglaDiferido
          abierto={panel.abierto}
          alCerrar={panel.cerrar}
          hayMas={hayMas}
          grupos={grupos}
          titulosFallaron={titulosFallaron}
        />
      ) : null}
    </>
  )
}
