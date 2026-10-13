'use client'

import { useRef } from 'react'
import { enfocarPrimerError, errorDeCampo } from '@/shared/lib/formularios'
import { Aviso } from '@/shared/ui/aviso'
import { Bloque } from '@/shared/ui/bloque'
import { Campo } from '@/shared/ui/campo'
import { useBorrador } from '@/shared/ui/use-borrador'
import { nombresDeGrupo, type CampoDeLayout } from '../../../entities/campo'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../entities/motivos'
import type { TipoDeOrigen } from '../../../entities/origen'
import type { EdicionesDeCampos } from '../hooks/use-campos'
import { useFormularioDeCampo } from '../hooks/use-formulario-de-campo'
import { AvisoDeImpacto } from './aviso-de-impacto'
import { CamposDeCampo, type ErroresDeCampo } from './campos-de-campo'
import { PieDelFormulario } from './pie-del-formulario'

type Props = {
  origenId: string
  tipoDeOrigen: TipoDeOrigen
  // null = un campo nuevo.
  campo: CampoDeLayout | null
  todos: readonly CampoDeLayout[]
  puedeGestionar: boolean
  ediciones: EdicionesDeCampos
  alCerrar: () => void
}

type ErroresDeValidacion = Partial<Record<string, string[]>> | undefined

// Los errores de una validación del servidor, junto a los que arma el formulario (un nombre repetido).
function erroresDelFormulario(
  propios: ErroresDeCampo,
  validacion: ErroresDeValidacion,
): ErroresDeCampo {
  const delServidor = (campo: string) => errorDeCampo(validacion, campo)
  return {
    ...propios,
    etiqueta: propios.etiqueta ?? delServidor('etiqueta'),
    opciones: propios.opciones ?? delServidor('opciones'),
    grupo: propios.grupo ?? delServidor('grupo'),
  }
}

// Crear o editar un campo. Los cambios que pueden tocar vehículos ya cargados (cambiar el tipo,
// volverlo requerido, sacar una opción) cuentan primero y muestran su aviso acá mismo.
export function FormularioDeCampo(props: Props) {
  const { origenId, tipoDeOrigen, campo, todos, puedeGestionar, ediciones, alCerrar } = props
  const formulario = useRef<HTMLFormElement>(null)
  const estado = useFormularioDeCampo({
    origenId,
    tipoDeOrigen,
    campo,
    todos,
    ediciones,
    alTerminar: alCerrar,
  })
  useBorrador(
    `origen-campo-${campo?.id ?? 'nuevo'}`,
    formulario,
    ['etiqueta', 'grupo', 'claveApibara'],
    puedeGestionar,
  )
  const erroresDeValidacion = ediciones.errores.crear
  const puedeEliminar = puedeGestionar && campo !== null && !campo.esSistema

  async function enviar() {
    const hecho = await estado.enviar()
    if (!hecho) {
      enfocarPrimerError(formulario.current)
    }
  }

  return (
    <form
      ref={formulario}
      noValidate
      className="grid gap-4"
      onSubmit={(evento) => {
        evento.preventDefault()
        void enviar()
      }}
    >
      <fieldset disabled={!puedeGestionar} className="grid min-w-0 gap-4">
        <legend className="sr-only">{campo ? `Campo ${campo.etiqueta}` : 'Campo nuevo'}</legend>
        {puedeGestionar ? null : <Aviso>{MOTIVO_SIN_PERMISO_ORIGENES}</Aviso>}
        <CamposDeCampo
          valores={estado.valores}
          alCambiar={estado.cambiar}
          campo={campo}
          gruposExistentes={nombresDeGrupo(todos)}
          errores={erroresDelFormulario(estado.errores, erroresDeValidacion)}
          deshabilitado={!puedeGestionar}
        />
        {tipoDeOrigen === 'subasta' ? (
          <Bloque titulo="Apibara" plegado>
            <Campo
              nombre="claveApibara"
              etiqueta="Campo de apibara"
              autoComplete="off"
              maxLength={60}
              value={estado.valores.claveApibara}
              onChange={(evento) => {
                estado.cambiar({ claveApibara: evento.target.value })
              }}
              ayuda="El campo del scraper del que se llena este dato al dar de alta por enlace. Déjalo vacío si se carga a mano."
            />
          </Bloque>
        ) : null}
      </fieldset>
      {estado.aviso ? <AvisoDeImpacto resumen={estado.aviso.resumen} /> : null}
      {puedeGestionar ? (
        <PieDelFormulario
          esNuevo={campo === null}
          puedeEliminar={puedeEliminar}
          aviso={estado.aviso}
          enCurso={ediciones.enCurso}
          alCancelar={alCerrar}
          alPedirEliminar={() => void estado.pedirEliminar()}
          alConfirmarEliminar={() => void estado.confirmarEliminar()}
        />
      ) : null}
    </form>
  )
}
