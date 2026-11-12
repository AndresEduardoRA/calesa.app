'use client'

import { useEffect, useId, useRef } from 'react'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { AvisosDelFormulario } from '@/shared/ui/avisos-del-formulario'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { Drawer } from '@/shared/ui/drawer'
import { focoDeQuienAbrio } from '@/shared/ui/foco-de-quien-abre'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import { useFormularioDeProyecto, type ElegidoInicial } from '../hooks/use-formulario-de-proyecto'
import { CamposDeProyecto, type BuscadorDeProyecto } from './campos-de-proyecto'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // Cada apertura empieza de cero: un id de intento nuevo y los campos vacíos.
  apertura: number
  // El vehículo con que se abrió (`?vehiculo=`), ya resuelto y visible; o el aviso si no se encontró.
  vehiculoInicial: ElegidoInicial | null
  avisoDelVehiculo: string | null
  puedeVerLeads: boolean
  buscadorDeVehiculo: BuscadorDeProyecto
  buscadorDeLead: BuscadorDeProyecto
}

function Formulario(p: Omit<Props, 'apertura'>) {
  const idFormulario = useId()
  const formulario = useRef<HTMLFormElement>(null)
  const f = useFormularioDeProyecto({
    vehiculoInicial: p.vehiculoInicial,
    alCerrar: p.alCerrar,
    abierto: p.abierto,
  })
  // Con algo escrito, la acción de un aviso que sale de la pantalla pregunta en el pie; descartar tira el borrador.
  useCambiosSinGuardar(f.hayCambios, f.descartarBorrador)
  const hayErrores = Object.keys(f.errores).length > 0
  useEffect(() => {
    if (hayErrores) {
      enfocarPrimerError(formulario.current)
    }
  }, [f.errores, hayErrores])
  return (
    <div className="grid gap-4">
      <form
        id={idFormulario}
        ref={formulario}
        noValidate
        className="grid gap-3"
        onSubmit={(evento) => {
          evento.preventDefault()
          void f.enviar()
        }}
      >
        <AvisosDelFormulario
          enLinea={f.enLinea}
          esperandoConexion={f.esperandoConexion}
          enCurso={f.enCurso}
          conflicto={null}
          aviso={f.aviso}
          alReintentar={() => void f.enviar()}
          alRecargar={p.alCerrar}
        />
        <CamposDeProyecto
          valores={f.valores}
          errores={f.errores}
          disabled={f.enCurso}
          puedeVerLeads={p.puedeVerLeads}
          avisoDelVehiculo={p.avisoDelVehiculo}
          escribir={f.escribir}
          buscadorDeVehiculo={p.buscadorDeVehiculo}
          buscadorDeLead={p.buscadorDeLead}
        />
      </form>
      <PieDelPanel
        idFormulario={idFormulario}
        enCurso={f.enCurso}
        alCancelar={p.alCerrar}
        etiquetaDeGuardar="Crear proyecto"
      />
    </div>
  )
}

// El formulario «Nuevo proyecto» (`?panel=nuevo-proyecto`): de un vehículo o externo. Se queda montado (cerrado) y cada apertura remonta el formulario con su `key`: id de intento nuevo y
// campos vacíos. Los buscadores los arma `src/app` y llegan como funciones de render. El contrato de cierre con algo escrito es de `<Drawer>` y `useCambiosSinGuardar`.
export function DrawerDeNuevoProyecto({ apertura, ...resto }: Props) {
  return (
    <Drawer
      abierto={resto.abierto}
      alCerrar={resto.alCerrar}
      titulo="Nuevo proyecto"
      descripcion="Un proyecto junta los repuestos de un vehículo o de un cliente externo."
      ancho="amplio"
      focoAlCerrar={focoDeQuienAbrio}
    >
      <Formulario key={apertura} {...resto} />
    </Drawer>
  )
}
