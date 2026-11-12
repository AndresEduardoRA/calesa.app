import { CommandGroup, CommandItem } from '@/shared/ui/command'
import type { AccionDeLaPaleta, DestinoDeLaAccion } from '../../../entities/acciones-de-la-paleta'
import type { EstadoDeLaBusqueda, EstadoDeLosUltimos } from '../../../entities/estado-de-la-paleta'
import { ListaDeResultados } from './lista-de-resultados'
import { Reintentar } from './reintentar'
import { UltimosAbiertos } from './ultimos-abiertos'

const AVISO = 'px-3 py-2 text-(length:--text-sm) text-(--color-ink-soft)'

const GRUPOS: { grupo: AccionDeLaPaleta['grupo']; titulo: string }[] = [
  { grupo: 'crear', titulo: 'Crear' },
  { grupo: 'ir', titulo: 'Navegar' },
  { grupo: 'ayuda', titulo: 'Ayuda' },
]

type Props = {
  texto: string
  // Las acciones que coinciden con el texto (ya filtradas y acotadas).
  acciones: readonly AccionDeLaPaleta[]
  busqueda: EstadoDeLaBusqueda
  ultimos: EstadoDeLosUltimos
  textoDeVerTodos: string | null
  alReintentarBusqueda: () => void
  alReintentarUltimos: () => void
  alElegir: (destino: DestinoDeLaAccion) => void
}

function Acciones({ acciones, alElegir }: Pick<Props, 'acciones' | 'alElegir'>) {
  return GRUPOS.map(({ grupo, titulo }) => {
    const propias = acciones.filter((accion) => accion.grupo === grupo)
    return propias.length === 0 ? null : (
      <CommandGroup key={grupo} heading={titulo}>
        {propias.map((accion) => (
          <CommandItem
            key={accion.clave}
            value={`accion:${accion.clave}`}
            onSelect={() => {
              alElegir(accion.destino)
            }}
          >
            {accion.titulo}
          </CommandItem>
        ))}
      </CommandGroup>
    )
  })
}

// Lo que la paleta enseña bajo el cuadro. Presentacional: recibe los estados y los avisos que da; no llama hooks de datos.
// Sin texto que alcance: «Últimos abiertos» y las acciones. Con texto: las acciones que coinciden (valen sin red) y debajo lo que dice la búsqueda.
export function CuerpoDeLaPaleta({
  texto,
  acciones,
  busqueda,
  ultimos,
  textoDeVerTodos,
  alReintentarBusqueda,
  alReintentarUltimos,
  alElegir,
}: Props) {
  if (busqueda.tipo === 'reposo') {
    return (
      <>
        <UltimosAbiertos estado={ultimos} alReintentar={alReintentarUltimos} alElegir={alElegir} />
        <Acciones acciones={acciones} alElegir={alElegir} />
      </>
    )
  }
  return (
    <>
      <Acciones acciones={acciones} alElegir={alElegir} />
      {(busqueda.tipo === 'esperando' || busqueda.tipo === 'buscando') && (
        <p role="status" aria-live="polite" className={AVISO}>
          Buscando…
        </p>
      )}
      {(busqueda.tipo === 'error' || busqueda.tipo === 'sin_conexion') && (
        <div className={AVISO}>
          <p role="status">{busqueda.mensaje}</p>
          <Reintentar alReintentar={alReintentarBusqueda} />
        </div>
      )}
      {busqueda.tipo === 'listo' && (
        <>
          {busqueda.porTelefono && <p className={AVISO}>No se busca por teléfono.</p>}
          <ListaDeResultados
            secciones={busqueda.secciones}
            textoDeVerTodos={textoDeVerTodos}
            alElegir={alElegir}
          />
          {busqueda.parcial && (
            <div className={AVISO}>
              <p role="status">Algunas secciones no respondieron.</p>
              <Reintentar alReintentar={alReintentarBusqueda} />
            </div>
          )}
          {busqueda.secciones.length === 0 && acciones.length === 0 && !busqueda.porTelefono && (
            <p role="status" className={AVISO}>
              {`Sin resultados para «${texto.trim()}».`}
            </p>
          )}
        </>
      )}
    </>
  )
}
