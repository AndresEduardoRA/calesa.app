'use client'

import type { CampoDeFormulario as Campo, ValorDeFormulario } from '@/shared/lib/campos'
import { Bloque } from '../bloque'
import { CampoDeFormulario } from './campo-de-formulario'

type Props = {
  titulo: string
  campos: readonly Campo[]
  valores: Readonly<Record<string, ValorDeFormulario>>
  errores: Readonly<Record<string, string | undefined>>
  alCambiar: (clave: string, valor: ValorDeFormulario) => void
  deshabilitado: boolean
  plegado: boolean
  // El primer campo del formulario recibe el foco al abrir.
  enfocarPrimero?: boolean
}

// Un bloque plegable de campos: se abre solo cuando alguno tiene un error (y no se cierra mientras
// lo tenga), y un texto largo ocupa las dos columnas.
export function BloqueDeCampos({
  titulo,
  campos,
  valores,
  errores,
  alCambiar,
  deshabilitado,
  plegado,
  enfocarPrimero,
}: Props) {
  if (campos.length === 0) {
    return null
  }
  const conError = campos.some((campo) => errores[campo.clave] !== undefined)
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
              valor={valores[campo.clave]}
              error={errores[campo.clave]}
              alCambiar={(valor) => {
                alCambiar(campo.clave, valor)
              }}
              deshabilitado={deshabilitado}
              enfocar={enfocarPrimero === true && indice === 0}
            />
          </div>
        ))}
      </div>
    </Bloque>
  )
}
