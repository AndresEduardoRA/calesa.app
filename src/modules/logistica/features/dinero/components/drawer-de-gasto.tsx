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
import type { Gasto } from '../../../entities/dinero/gasto'
import { avisarCambioDeDinero } from '../hooks/eventos-de-dinero'
import { useFormularioDeGasto } from '../hooks/use-formulario-de-gasto'
import { useOpcionesDeGasto } from '../hooks/use-opciones-de-gasto'
import { CamposDeGasto } from './campos-de-gasto'

type Props = {
  abierto: boolean
  alCerrar: () => void
  unidadId: string
  // Nulo = «Registrar gasto».
  original: Gasto | null
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
  const f = useFormularioDeGasto({ unidadId, original, opciones, alCerrar, abierto })
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
        <CamposDeGasto unidadId={unidadId} original={original} opciones={opciones} formulario={f} />
      </form>
      <PieDelPanel
        idFormulario={idFormulario}
        enCurso={f.enCurso}
        alCancelar={alCerrar}
        etiquetaDeGuardar={original ? 'Guardar' : 'Registrar gasto'}
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

// El formulario de un gasto (`?panel=gasto&gasto=<id|nuevo>`): «Registrar gasto» y «Editar». Lee las categorías, monedas y tipos de cambio al abrirse; el drawer se queda montado
// (cerrado) y lo de adentro cambia del esqueleto al formulario. El contrato de cierre con algo escrito es de `<Drawer>` y `useCambiosSinGuardar`.
export function DrawerDeGasto({ abierto, alCerrar, unidadId, original, apertura }: Props) {
  const lectura = useOpcionesDeGasto(abierto, apertura)
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={original ? 'Editar gasto' : 'Registrar gasto'}
      descripcion="El equivalente en la moneda base lo calcula el sistema al guardar."
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
