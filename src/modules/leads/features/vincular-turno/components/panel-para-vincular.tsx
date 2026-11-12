'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { useMemo } from 'react'
import { CLAVE_DE_CURSOR, CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { Aviso } from '@/shared/ui/aviso'
import { useAtajo } from '@/shared/ui/atajos'
import { Drawer } from '@/shared/ui/drawer'
import { PestanasConDesborde } from '@/shared/ui/pestanas-con-desborde'
import { CLAVE_DE_ELEGIR } from '../../../entities/elegir-al-crear'
import {
  PESTANAS_DEL_PANEL,
  pestanaDelPanel,
  TITULO_DE_LA_PESTANA,
} from '../../../entities/panel-para-cotizar'
import { CLAVES_DE_LA_BUSQUEDA } from '../claves'
import { PANEL_NUEVO_LEAD } from '../../alta/hooks/use-panel-de-alta'
import { BuscadorDeClientes } from '../../panel-para-cotizar/components/buscador-de-clientes'
import { ListaDeClientes } from '../../panel-para-cotizar/components/lista-de-clientes'
import { CLAVE_DE_BUSQUEDA, CLAVE_DE_CLASE } from '../../panel-para-cotizar/claves'
import { useClientesDelPanel } from '../../panel-para-cotizar/hooks/use-clientes-del-panel'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // El lead elegido: quien monta el panel decide qué hacer (vincularlo al turno) y, si falla, lo dice en `error`.
  alElegir: (leadId: string) => void
  // `leads.crear` (lo decide la página con `puede()`): con él, el campo lleva «+», que abre «Nuevo lead».
  puedeCrear: boolean
  // `leads.numero_global.ver` (lo decide la página con `puede()`).
  numeroGlobal: boolean
  // La clave de la URL donde el alta deja el lead creado (`?<clave>=<leadId>`).
  claveDeLaUrl: string
  // Por qué no se pudo vincular, si no se pudo; el panel sigue abierto.
  error?: string | null
}

const PESTANAS = PESTANAS_DEL_PANEL.map((clave) => ({
  clave,
  titulo: TITULO_DE_LA_PESTANA[clave],
}))

// «Vincular a un lead» de un turno de la web (8.05-1): el mismo buscador y la misma lista que el panel del cliente de la hoja de cotizar (mis leads por lo más reciente
// por pestañas, o la búsqueda por nombre o número), pero sin elegido: elegir un lead se lo pasa a quien monta el panel. «+» abre «Nuevo lead» del shell y deja al creado en
// `?<claveDeLaUrl>=`, con `?turno=` en la URL. El panel no edita nada: no hay cambios sin guardar.
export function PanelParaVincular({
  abierto,
  alCerrar,
  alElegir,
  puedeCrear,
  numeroGlobal,
  claveDeLaUrl,
  error = null,
}: Props) {
  const parsers = useMemo(
    () =>
      Object.fromEntries(
        [CLAVE_DE_PANEL, CLAVE_DE_ELEGIR, ...CLAVES_DE_LA_BUSQUEDA].map((clave) => [
          clave,
          parseAsString,
        ]),
      ),
    [],
  )
  const [, escribir] = useQueryStates(parsers)
  // El último registro responde: nada que guardar detrás.
  useAtajo('guardar', () => undefined, abierto)
  const nuevoLead = () => {
    void escribir(
      {
        [CLAVE_DE_PANEL]: PANEL_NUEVO_LEAD,
        [CLAVE_DE_ELEGIR]: claveDeLaUrl,
        [CLAVE_DE_CLASE]: null,
        [CLAVE_DE_BUSQUEDA]: null,
        [CLAVE_DE_CURSOR]: null,
      },
      { history: 'replace' },
    )
  }
  return (
    <Drawer abierto={abierto} alCerrar={alCerrar} titulo="Vincular a un lead">
      {abierto ? (
        <Contenido
          numeroGlobal={numeroGlobal}
          alElegir={alElegir}
          alNuevoLead={puedeCrear ? nuevoLead : undefined}
          error={error}
        />
      ) : null}
    </Drawer>
  )
}

// Se monta en cada apertura.
function Contenido(props: {
  numeroGlobal: boolean
  alElegir: (leadId: string) => void
  alNuevoLead: (() => void) | undefined
  error: string | null
}) {
  const { numeroGlobal, alElegir, alNuevoLead, error } = props
  const { lista, pestana, texto, leido, leida, cambiarPestana, cambiarTexto, irA, reintentar } =
    useClientesDelPanel({ numeroGlobal })
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      {error ? <Aviso tono="peligro">{error}</Aviso> : null}
      <BuscadorDeClientes
        textoDeUrl={texto}
        aviso={leido.aviso}
        alCambiar={cambiarTexto}
        alNuevoLead={alNuevoLead}
      />
      {lista === 'busqueda' ? (
        <h3 className="text-(length:--text-sm) font-medium text-(--color-ink)">Resultados</h3>
      ) : (
        <PestanasConDesborde
          pestanas={PESTANAS}
          valor={pestana}
          alElegir={(clave) => {
            cambiarPestana(pestanaDelPanel(clave))
          }}
        />
      )}
      <ListaDeClientes
        lista={lista}
        texto={leido.busqueda?.texto ?? ''}
        leida={leida}
        elegidoId={null}
        alElegir={alElegir}
        alIr={irA}
        alReintentar={reintentar}
      />
    </div>
  )
}
