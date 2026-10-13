'use client'

import { useRef } from 'react'
import { agruparCampos, type CampoDeLayout } from '@/modules/origenes/client'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { RUTAS } from '@/shared/lib/rutas'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Bloque } from '@/shared/ui/bloque'
import { Button } from '@/shared/ui/button'
import { BLOQUES_COMUNES } from '../../../entities/comunes'
import type { Fuentes } from '../../../entities/esquema'
import type { Vehiculo } from '../../../entities/vehiculo'
import { campoDeAtributo, camposDeComunes, type CampoDeFormulario as Campo } from '../controles'
import type { FormularioDeVehiculo as Estado } from '../hooks/use-formulario-de-vehiculo'
import { CampoDeFormulario } from './campo-de-formulario'

type Props = {
  id: string
  estado: Estado
  fuentes: Fuentes
  // Los campos activos del layout, para agruparlos como los agrupa su origen.
  campos: readonly CampoDeLayout[]
  // null = un alta.
  vehiculo: Vehiculo | null
  alRecargar: () => void
}

type PropsDeBloque = {
  titulo: string
  campos: readonly Campo[]
  estado: Estado
  plegado: boolean
  // El primer campo del formulario recibe el foco al abrir.
  enfocarPrimero?: boolean
}

function BloqueDeCampos({ titulo, campos, estado, plegado, enfocarPrimero }: PropsDeBloque) {
  if (campos.length === 0) {
    return null
  }
  const conError = campos.some((campo) => estado.errores[campo.clave] !== undefined)
  return (
    <Bloque titulo={titulo} plegado={plegado} forzarAbierto={conError}>
      <div className="grid gap-3 sm:grid-cols-2">
        {campos.map((campo, indice) => (
          <div
            key={campo.clave}
            className={campo.control.tipo === 'texto_largo' ? 'sm:col-span-2' : undefined}
          >
            <CampoDeFormulario
              campo={campo}
              valor={estado.valores[campo.clave]}
              error={estado.errores[campo.clave]}
              alCambiar={(valor) => {
                estado.cambiar(campo.clave, valor)
              }}
              deshabilitado={estado.enCurso}
              enfocar={enfocarPrimero === true && indice === 0}
            />
          </div>
        ))}
      </div>
    </Bloque>
  )
}

// Lo que pasa con el guardado, dicho arriba del formulario: sin conexión, esperando para
// reintentar, un conflicto con otra persona o un rechazo que no es de ningún campo.
function AvisosDelFormulario({
  estado,
  vehiculo,
  alRecargar,
}: Omit<Props, 'id' | 'fuentes' | 'campos'>) {
  return (
    <>
      {estado.enLinea ? null : (
        <Aviso tono="aviso">
          {estado.esperandoConexion
            ? 'No hay conexión. Lo que escribiste sigue acá y se va a guardar solo cuando vuelva.'
            : 'No hay conexión. Puedes seguir escribiendo: se guarda cuando vuelva.'}
        </Aviso>
      )}
      {estado.enLinea && estado.esperandoConexion ? (
        <Aviso tono="aviso">
          <p>No pudimos llegar al servidor. Lo que escribiste sigue acá.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 min-h-11 md:min-h-7"
            onClick={() => void estado.enviar(false)}
            disabled={estado.enCurso}
          >
            Reintentar
          </Button>
        </Aviso>
      ) : null}
      {estado.conflicto ? (
        <AvisoDeConflicto
          mensaje={estado.conflicto}
          hrefVer={vehiculo ? `${RUTAS.vehiculos}/${vehiculo.id}` : undefined}
          alRecargar={alRecargar}
        />
      ) : null}
      {estado.aviso ? <Aviso tono="peligro">{estado.aviso}</Aviso> : null}
    </>
  )
}

// El formulario de un vehículo: los datos comunes en dos bloques y un bloque por cada grupo del
// layout de su origen, en su orden. El primero nace abierto y los demás plegados, salvo los que
// tienen algo obligatorio; uno con un error se abre solo.
export function FormularioDeVehiculo({ id, estado, fuentes, campos, vehiculo, alRecargar }: Props) {
  const formulario = useRef<HTMLFormElement>(null)
  const comunes = camposDeComunes(
    fuentes.comunes,
    fuentes.categorias,
    vehiculo?.categoriaId ?? null,
  )
  const grupos = agruparCampos(campos).map((grupo) => ({
    titulo: grupo.nombre ?? 'Otros datos',
    campos: grupo.campos.map((campo) => campoDeAtributo(campo, vehiculo?.atributos[campo.clave])),
  }))

  async function enviar() {
    if (!(await estado.enviar(false))) {
      enfocarPrimerError(formulario.current)
    }
  }

  return (
    <form
      id={id}
      ref={formulario}
      noValidate
      className="grid gap-3"
      onSubmit={(evento) => {
        evento.preventDefault()
        void enviar()
      }}
    >
      <AvisosDelFormulario estado={estado} vehiculo={vehiculo} alRecargar={alRecargar} />
      {BLOQUES_COMUNES.map((bloque, indice) => (
        <BloqueDeCampos
          key={bloque.clave}
          titulo={bloque.titulo}
          campos={comunes.filter((campo) => campo.bloque === bloque.clave)}
          estado={estado}
          plegado={indice > 0}
          enfocarPrimero={indice === 0}
        />
      ))}
      {grupos.map((grupo) => (
        <BloqueDeCampos
          key={grupo.titulo}
          titulo={grupo.titulo}
          campos={grupo.campos}
          estado={estado}
          plegado={!grupo.campos.some((campo) => campo.requerido)}
        />
      ))}
    </form>
  )
}
