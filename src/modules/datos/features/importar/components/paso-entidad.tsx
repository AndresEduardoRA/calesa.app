'use client'

import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { textoDelTope } from '@/shared/lib/conteo'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { TOPE_DE_DESTINOS, type OpcionesDeImportar } from '../../../entities/opciones-de-importar'
import type { EntidadImportable } from '../../../entities/plantillas'
import type { PersonaParaDestino } from '../contexto-de-la-seccion'

// El destino «Yo»: los leads quedan en la cartera de quien importa.
export const DESTINO_YO = 'yo'

const ETIQUETA: Record<EntidadImportable, string> = { leads: 'Leads', vehiculos: 'Vehículos' }

const PARAMETROS = {
  entidad: parseAsStringLiteral(['leads', 'vehiculos'] as const),
  origen: parseAsString,
}

type Props = {
  opciones: OpcionesDeImportar
  entidad: EntidadImportable
  origenId: string | null
  // En leads con `datos.importar.todo`.
  personas: readonly PersonaParaDestino[]
  hayMasPersonas: boolean
  destino: string
  alElegirDestino: (destino: string) => void
  // Mientras se lanza una importación.
  deshabilitado: boolean
}

// «Qué importas»: la entidad y el origen viven en la URL, porque el servidor lee sólo el contexto de esa entidad (D43); el destino es una
// elección del archivo y vive en memoria. Sólo se ofrece lo que se puede importar.
export function PasoEntidad({
  opciones,
  entidad,
  origenId,
  personas,
  hayMasPersonas,
  destino,
  alElegirDestino,
  deshabilitado,
}: Props) {
  const [, fijar] = useQueryStates(PARAMETROS, { shallow: false })
  const entidades: EntidadImportable[] = [
    ...(opciones.leads ? (['leads'] as const) : []),
    ...(opciones.vehiculos.length > 0 ? (['vehiculos'] as const) : []),
  ]
  const conOtros = entidad === 'leads' && opciones.leads?.otros === true
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <CampoSeleccion
        nombre="entidad-a-importar"
        etiqueta="Qué importas"
        opciones={entidades.map((una) => ({ valor: una, etiqueta: ETIQUETA[una] }))}
        value={entidad}
        disabled={deshabilitado}
        onChange={(evento) => {
          void fijar({
            entidad: evento.target.value === 'vehiculos' ? 'vehiculos' : 'leads',
            origen: null,
          })
        }}
      />
      {entidad === 'vehiculos' ? (
        <CampoSeleccion
          nombre="origen-a-importar"
          etiqueta="Origen"
          opciones={[
            { valor: '', etiqueta: 'Elige un origen' },
            ...opciones.vehiculos.map((origen) => ({ valor: origen.id, etiqueta: origen.nombre })),
          ]}
          value={origenId ?? ''}
          disabled={deshabilitado}
          onChange={(evento) => {
            void fijar({ origen: evento.target.value === '' ? null : evento.target.value })
          }}
        />
      ) : null}
      {conOtros ? (
        <div className="grid gap-1.5">
          <CampoSeleccion
            nombre="destino-de-los-leads"
            etiqueta="Destino"
            opciones={[
              { valor: '', etiqueta: 'Elige a quién van los leads' },
              ...(opciones.leads?.yo ? [{ valor: DESTINO_YO, etiqueta: 'Yo' }] : []),
              ...personas.map((persona) => ({ valor: persona.id, etiqueta: persona.nombre })),
            ]}
            value={destino}
            disabled={deshabilitado}
            ayuda="Los leads quedan en su cartera."
            onChange={(evento) => {
              alElegirDestino(evento.target.value)
            }}
          />
          {hayMasPersonas ? (
            <AvisoDeTope
              texto={textoDelTope(TOPE_DE_DESTINOS, {
                sustantivo: 'personas',
                orden: 'primeras por nombre',
                articulo: 'las',
              })}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
