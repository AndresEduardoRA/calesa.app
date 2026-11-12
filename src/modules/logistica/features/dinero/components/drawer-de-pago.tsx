'use client'

import { useEffect, useId, useRef } from 'react'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { Aviso } from '@/shared/ui/aviso'
import { AvisosDelFormulario } from '@/shared/ui/avisos-del-formulario'
import { Button } from '@/shared/ui/button'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { Drawer } from '@/shared/ui/drawer'
import { focoDeQuienAbrio } from '@/shared/ui/foco-de-quien-abre'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import { Skeleton } from '@/shared/ui/skeleton'
import type { OpcionesDeGasto } from '../../../areas/dinero/composicion.client'
import type { Pago } from '../../../entities/dinero/pago'
import { avisarCambioDeDinero } from '../hooks/eventos-de-dinero'
import { useFormularioDePago } from '../hooks/use-formulario-de-pago'
import { useOpcionesDeGasto } from '../hooks/use-opciones-de-gasto'
import { CamposDePago } from './campos-de-pago'

type Props = {
  abierto: boolean
  alCerrar: () => void
  unidadId: string
  // Nulo = «Registrar pago».
  original: Pago | null
  // Cada apertura empieza de cero: un id de intento nuevo y los campos de lo guardado.
  apertura: number
}

type ContenidoProps = Omit<Props, 'abierto' | 'apertura'> & {
  abierto: boolean
  opciones: OpcionesDeGasto
}

function Formulario({ abierto, alCerrar, unidadId, original, opciones }: ContenidoProps) {
  const idFormulario = useId()
  const formulario = useRef<HTMLFormElement>(null)
  const f = useFormularioDePago({ unidadId, original, opciones, alCerrar, abierto })
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
          conflicto={f.conflicto}
          aviso={f.aviso}
          detalleDelConflicto="Recargar trae la versión de la otra persona y descarta lo que escribiste."
          alReintentar={() => void f.enviar()}
          alRecargar={() => {
            // La versión nueva llega con la lista; lo escrito se descarta a propósito.
            f.descartarBorrador()
            avisarCambioDeDinero(unidadId)
            alCerrar()
          }}
        />
        <CamposDePago unidadId={unidadId} original={original} opciones={opciones} formulario={f} />
      </form>
      <PieDelPanel
        idFormulario={idFormulario}
        enCurso={f.enCurso}
        alCancelar={alCerrar}
        etiquetaDeGuardar={original ? 'Guardar' : 'Registrar pago'}
      />
    </div>
  )
}

function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando el formulario" className="grid gap-3">
      <Skeleton className="h-9" />
      <Skeleton className="h-9" />
      <Skeleton className="h-9" />
    </div>
  )
}

// El formulario de un pago (`?panel=pago&pago=<id|nuevo>`): «Registrar pago» y «Editar». Lee las monedas y los tipos de cambio al abrirse; el drawer se queda montado
// (cerrado) y lo de adentro cambia del esqueleto al formulario. El contrato de cierre con algo escrito es de `<Drawer>` y `useCambiosSinGuardar`.
export function DrawerDePago({ abierto, alCerrar, unidadId, original, apertura }: Props) {
  const lectura = useOpcionesDeGasto(abierto, apertura)
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={original ? 'Editar pago' : 'Registrar pago'}
      descripcion="El equivalente en la moneda base lo calcula el sistema al guardar. Un pago confirmado queda sellado."
      ancho="amplio"
      focoAlCerrar={focoDeQuienAbrio}
    >
      {lectura.tipo === 'listo' ? (
        <Formulario
          key={`${String(apertura)}-${original?.id ?? 'nuevo'}-${original?.actualizadoEn ?? ''}`}
          abierto={abierto}
          alCerrar={alCerrar}
          unidadId={unidadId}
          original={original}
          opciones={lectura.opciones}
        />
      ) : lectura.tipo === 'error' ? (
        <div className="grid gap-3">
          <Aviso tono="peligro">
            <p>{lectura.error.mensaje}</p>
          </Aviso>
          <Button variant="outline" onClick={lectura.reintentar}>
            Reintentar
          </Button>
        </div>
      ) : (
        <Cargando />
      )}
    </Drawer>
  )
}
