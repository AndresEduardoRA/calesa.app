'use client'

import { ArrowLeftIcon } from 'lucide-react'
import { useEffect, useId } from 'react'
import { concordar, useLayoutActivo, type LayoutActivo } from '@/modules/origenes/client'
import { Button } from '@/shared/ui/button'
import { EstadoError } from '@/shared/ui/estados'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import { Skeleton } from '@/shared/ui/skeleton'
import { avisarExito } from '@/shared/ui/toasts'
import { useCierreConCambios } from '@/shared/ui/use-cierre-con-cambios'
import { FormularioDeVehiculo } from '../../alta/components/formulario-de-vehiculo'
import { useFormularioDeVehiculo, type Guardado } from '../../alta/hooks/use-formulario-de-vehiculo'
import { useFuentesDelPanel } from '../../alta/hooks/use-fuentes-del-panel'
import { AltaPorSubasta } from '../../subasta/components/alta-por-subasta'
import { useGuardadoDeSubasta } from '../../subasta/hooks/use-guardado-de-subasta'
import type { AltaDelPanel } from '../alta-del-panel'
import type { VistaDeAlta } from '../claves'

type Props = {
  alta: AltaDelPanel
  vista: VistaDeAlta
  // Lo que arranca pegado en «Traer de la subasta» y si consulta al montarse (sólo si se acaba de decidir traerlo).
  textoInicial: string
  consultarAlMontar: boolean
  alVolver: () => void
  // El vehículo que se creó: la hoja lo elige.
  alElegir: (id: string) => void
}

const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)

// El alta del inventario dentro del panel del vehículo de la hoja de cotizar (`?alta=mano|subasta`): el mismo formulario, las mismas reglas y el
// mismo borrador (`vehiculo-nuevo-<origen>`) que «Nuevo» en `/vehiculos`. «Crear y elegir» crea el vehículo y la hoja lo elige; no hay «Abrir ficha»
// (saldría de la hoja) ni «Guardar y cargar otro». Con varias líneas pegadas, guardar una no elige ninguna: quedan las demás.
function AltaCargada(props: Props & { layout: LayoutActivo }) {
  const { alta, layout, vista, textoInicial, consultarAlMontar, alVolver, alElegir } = props
  const { campos, categorias } = layout
  const { origen, apibara } = alta
  const idFormulario = useId()
  const { activos, fuentes } = useFuentesDelPanel({ origen, campos, categorias, vehiculo: null })
  const subasta = useGuardadoDeSubasta(origen.id)

  function alGuardar(datos: Guardado) {
    const creado = concordar(origen.genero, { m: 'creado', f: 'creada' })
    avisarExito(`${mayuscula(origen.sustantivo)} #${String(datos.numero ?? '')} ${creado}`)
    subasta.despuesDeGuardar(datos)
    if (!datos.subasta?.clave) {
      alElegir(datos.id)
    }
  }

  const estado = useFormularioDeVehiculo({
    origenId: origen.id,
    vehiculo: null,
    fuentes,
    activo: true,
    alGuardar,
  })
  const salida = useCierreConCambios({
    hayCambios: estado.hayCambios,
    alCerrar: alVolver,
    alDescartar: estado.descartarBorrador,
  })
  const porSubasta = vista === 'subasta' && origen.tipo === 'subasta'
  // Al abrirse, el foco va a donde se sigue: lo pegado, o el título.
  useEffect(() => {
    document.getElementById(porSubasta ? 'pegado-de-subasta' : 'titulo')?.focus()
  }, [porSubasta])

  return (
    <>
      {porSubasta ? (
        <AltaPorSubasta
          origen={origen}
          campos={activos}
          fuentes={fuentes}
          estado={estado}
          apibara={apibara}
          traerFotos={subasta.traerFotos}
          guardado={subasta.guardado}
          textoInicial={textoInicial}
          consultarAlMontar={consultarAlMontar}
        />
      ) : null}
      <FormularioDeVehiculo
        id={idFormulario}
        estado={estado}
        fuentes={fuentes}
        campos={activos}
        vehiculo={null}
        alRecargar={alVolver}
      />
      <PieDelPanel
        salida={salida}
        idFormulario={idFormulario}
        enCurso={estado.enCurso}
        alCancelar={alVolver}
        etiquetaDeGuardar="Crear y elegir"
        etiquetaEnCurso="Creando…"
      />
    </>
  )
}

// El alta se pide recién al abrirse: el layout del origen (106 campos en uno de subasta) no viaja en el documento de la hoja, se lee aquí desde el navegador (P2 del
// 4.14-2c). «Volver a la lista» está siempre, también mientras carga o si falla.
export function AltaDesdeElPanel(props: Props) {
  const { leido, reintentar } = useLayoutActivo(props.alta.origen.id)
  return (
    <div className="grid min-w-0 gap-4">
      <div>
        <Button type="button" variant="ghost" className="h-11 md:h-9" onClick={props.alVolver}>
          <ArrowLeftIcon aria-hidden="true" />
          Volver a la lista
        </Button>
      </div>
      {leido.estado === 'listo' ? (
        <AltaCargada {...props} layout={leido.layout} />
      ) : leido.estado === 'error' ? (
        <div role="alert">
          <EstadoError titulo="No se pudo abrir el formulario." alReintentar={reintentar} />
        </div>
      ) : (
        <div aria-busy="true" aria-label="Cargando el formulario" className="grid gap-2">
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </div>
      )}
    </div>
  )
}
