'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef } from 'react'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { AvisosDelFormulario } from '@/shared/ui/avisos-del-formulario'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { Drawer } from '@/shared/ui/drawer'
import { focoDeQuienAbrio } from '@/shared/ui/foco-de-quien-abre'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import type { FilaDeCompra } from '../../../entities/compras/compra'
import { useFormularioDeCompra } from '../hooks/use-formulario-de-compra'
import { CamposDeCompra, type ItemParaCompra, type MonedaParaCompra } from './campos-de-compra'

type Props = {
  abierto: boolean
  alCerrar: () => void
  proyectoId: string
  // Nula = «Registrar compra».
  original: FilaDeCompra | null
  // Cada apertura empieza de cero: un id de intento nuevo y los campos de lo guardado.
  apertura: number
  items: readonly ItemParaCompra[]
  monedas: readonly MonedaParaCompra[]
}

function Formulario({
  abierto,
  alCerrar,
  proyectoId,
  original,
  items,
  monedas,
}: Omit<Props, 'apertura'>) {
  const router = useRouter()
  const idFormulario = useId()
  const formulario = useRef<HTMLFormElement>(null)
  const f = useFormularioDeCompra({ proyectoId, original, alCerrar, abierto })
  // Con algo escrito, la acción de un aviso que sale de la pantalla pregunta en el pie; descartar tira el borrador.
  useCambiosSinGuardar(f.hayCambios, f.descartarBorrador)
  const hayErrores = Object.keys(f.errores).length > 0
  useEffect(() => {
    if (hayErrores) enfocarPrimerError(formulario.current)
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
            // La versión nueva llega con la página; lo escrito se descarta a propósito.
            f.descartarBorrador()
            router.refresh()
            alCerrar()
          }}
        />
        <CamposDeCompra
          proyectoId={proyectoId}
          original={original}
          items={items}
          monedas={monedas}
          formulario={f}
        />
      </form>
      <PieDelPanel
        idFormulario={idFormulario}
        enCurso={f.enCurso}
        alCancelar={alCerrar}
        etiquetaDeGuardar={original ? 'Guardar' : 'Registrar compra'}
      />
    </div>
  )
}

// El formulario de una compra (`?panel=compra&compra=<id|nueva>`, 8.11-3, C12): «Registrar compra» y «Editar». Las opciones (ítems y monedas) ya las leyó la
// página. El contrato de cierre con algo escrito es de `<Drawer>` y `useCambiosSinGuardar`. El pie repite «Registrar compra» a propósito: está dentro del diálogo.
export function DrawerDeCompra({ apertura, ...props }: Props) {
  const { abierto, alCerrar, original } = props
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={original ? 'Editar compra' : 'Registrar compra'}
      descripcion="El equivalente en la moneda base lo calcula el sistema al guardar, con el tipo de cambio por defecto."
      ancho="amplio"
      focoAlCerrar={focoDeQuienAbrio}
    >
      <Formulario
        key={`${String(apertura)}-${original?.id ?? 'nueva'}-${original?.actualizadoEn ?? ''}`}
        {...props}
      />
    </Drawer>
  )
}
