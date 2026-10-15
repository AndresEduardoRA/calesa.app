'use client'

import { useRef } from 'react'
import { agruparCampos, type CampoDeLayout } from '@/modules/origenes/client'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { RUTAS } from '@/shared/lib/rutas'
import { AvisosDelFormulario } from '@/shared/ui/avisos-del-formulario'
import { BloqueDeCampos } from '@/shared/ui/campos'
import { BLOQUES_COMUNES } from '../../../entities/comunes'
import type { Fuentes } from '../../../entities/esquema'
import type { Vehiculo } from '../../../entities/vehiculo'
import { campoDeAtributo, camposDeComunes } from '../controles'
import type { FormularioDeVehiculo as Estado } from '../hooks/use-formulario-de-vehiculo'

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
      <AvisosDelFormulario
        enLinea={estado.enLinea}
        esperandoConexion={estado.esperandoConexion}
        enCurso={estado.enCurso}
        conflicto={estado.conflicto}
        aviso={estado.aviso}
        hrefVer={vehiculo ? `${RUTAS.vehiculos}/${vehiculo.id}` : undefined}
        alReintentar={() => void estado.enviar(false)}
        alRecargar={alRecargar}
      />
      {BLOQUES_COMUNES.map((bloque, indice) => (
        <BloqueDeCampos
          key={bloque.clave}
          titulo={bloque.titulo}
          campos={comunes.filter((campo) => campo.bloque === bloque.clave)}
          valores={estado.valores}
          errores={estado.errores}
          alCambiar={estado.cambiar}
          deshabilitado={estado.enCurso}
          plegado={indice > 0}
          enfocarPrimero={indice === 0}
        />
      ))}
      {grupos.map((grupo) => (
        <BloqueDeCampos
          key={grupo.titulo}
          titulo={grupo.titulo}
          campos={grupo.campos}
          valores={estado.valores}
          errores={estado.errores}
          alCambiar={estado.cambiar}
          deshabilitado={estado.enCurso}
          plegado={!grupo.campos.some((campo) => campo.requerido)}
        />
      ))}
    </form>
  )
}
