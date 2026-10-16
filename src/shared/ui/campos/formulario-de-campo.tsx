'use client'

import { useRef } from 'react'
import { nombresDeGrupo, type CampoBase } from '@/shared/lib/campos'
import { enfocarPrimerError, errorDeCampo } from '@/shared/lib/formularios'
import { Aviso } from '@/shared/ui/aviso'
import { useBorrador } from '@/shared/ui/use-borrador'
import { AvisoDeImpacto } from './aviso-de-impacto'
import { CamposDeCampo } from './campos-de-campo'
import { PieDelFormulario } from './pie-del-formulario'
import type { ConfiguracionDeCampos, EdicionesDeCampos, ErroresDeCampo } from './tipos'
import { useFormularioDeCampo } from './use-formulario-de-campo'

type Props<Campo extends CampoBase, Cambios extends object, Nuevo> = {
  // null = un campo nuevo.
  campo: Campo | null
  todos: readonly Campo[]
  puedeGestionar: boolean
  configuracion: ConfiguracionDeCampos<Campo, Cambios, Nuevo>
  ediciones: EdicionesDeCampos<Cambios, Nuevo>
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
    valorDefecto: propios.valorDefecto ?? delServidor('valorDefecto'),
  }
}

// Crear o editar un campo. Los cambios que pueden tocar datos ya cargados (cambiar el tipo,
// volverlo requerido, sacar una opción) cuentan primero y muestran su aviso acá mismo.
export function FormularioDeCampo<Campo extends CampoBase, Cambios extends object, Nuevo>(
  props: Props<Campo, Cambios, Nuevo>,
) {
  const { campo, todos, puedeGestionar, configuracion, ediciones, alCerrar } = props
  const formulario = useRef<HTMLFormElement>(null)
  const estado = useFormularioDeCampo({
    campo,
    todos,
    configuracion,
    ediciones,
    alTerminar: alCerrar,
  })
  const borrador = useBorrador(
    `${configuracion.textos.borrador}-${campo?.id ?? 'nuevo'}`,
    formulario,
    ['etiqueta', 'grupo', ...configuracion.textosLibres],
    { activo: puedeGestionar, controlado: true },
  )
  const erroresDeValidacion = ediciones.errores.crear
  const puedeEliminar = puedeGestionar && campo !== null && !campo.esSistema

  async function enviar() {
    const hecho = await estado.enviar()
    if (hecho) {
      // Lo tipeado ya está en la base: un borrador que sobrevive reaparecería como «recuperado»
      // si otra persona cambia el campo después.
      borrador.limpiar()
    } else {
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
        {puedeGestionar ? null : <Aviso>{configuracion.textos.motivoSinPermiso}</Aviso>}
        <CamposDeCampo
          valores={estado.valores}
          alCambiar={estado.cambiar}
          alCambiarBandera={estado.cambiarBandera}
          campo={campo}
          banderas={configuracion.banderas}
          tipos={configuracion.tipos}
          gruposExistentes={nombresDeGrupo(todos)}
          errores={erroresDelFormulario(estado.errores, erroresDeValidacion)}
          deshabilitado={!puedeGestionar}
        />
        {configuracion.hueco?.({
          valores: estado.valores,
          cambiarTexto: estado.cambiarTexto,
          deshabilitado: !puedeGestionar,
        })}
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
