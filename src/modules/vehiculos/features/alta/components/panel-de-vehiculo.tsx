'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef } from 'react'
import {
  concordar,
  type CampoDeLayout,
  type Categoria,
  type OrigenResumen,
} from '@/modules/origenes/client'
import { RUTAS } from '@/shared/lib/rutas'
import { useAtajo } from '@/shared/ui/atajos'
import { Drawer } from '@/shared/ui/drawer'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import { avisarExito } from '@/shared/ui/toasts'
import { useCierreConCambios } from '@/shared/ui/use-cierre-con-cambios'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { DisponibilidadDeApibara } from '../../../entities/apibara'
import type { Vehiculo } from '../../../entities/vehiculo'
import {
  useFormularioDeVehiculo,
  type FormularioDeVehiculo as EstadoDelFormulario,
  type Guardado,
} from '../hooks/use-formulario-de-vehiculo'
import { useFuentesDelPanel } from '../hooks/use-fuentes-del-panel'
import { focoAlCerrarElPanel, usePanelDeVehiculo } from '../hooks/use-panel-de-vehiculo'
import { useGuardadoDeSubasta } from '../../subasta/hooks/use-guardado-de-subasta'
import { AltaPorSubasta } from '../../subasta/components/alta-por-subasta'
import { FormularioDeVehiculo } from './formulario-de-vehiculo'

type Datos = {
  origen: OrigenResumen
  campos: readonly CampoDeLayout[]
  categorias: readonly Categoria[]
}

type Props = Datos & {
  // Si la persona puede dar de alta en este origen (con él activo): habilita «Nuevo» y la tecla N.
  puedeCrear: boolean
  // El vehículo de `?editar=`, ya leído por el servidor; null si no hay o no lo puede editar.
  enEdicion: Vehiculo | null
  // Si el alta de un origen de subasta puede traer la ficha de apibara.
  apibara: DisponibilidadDeApibara
}

const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)

type PropsDeContenido = Datos & {
  apibara: DisponibilidadDeApibara
  vehiculo: Vehiculo | null
  alCerrar: () => void
  alCrear: () => void
}

// «Vehículo #12 creado», con un atajo a su ficha.
function avisarCreado(origen: OrigenResumen, { numero }: Guardado, abrirFicha: () => void) {
  const creado = concordar(origen.genero, { m: 'creado', f: 'creada' })
  avisarExito(`${mayuscula(origen.sustantivo)} #${String(numero ?? '')} ${creado}`, {
    etiqueta: 'Abrir ficha',
    sale: true,
    alHacer: abrirFicha,
  })
}

// Cerrar el panel no pregunta (el borrador guarda lo escrito): sólo una salida desde un aviso («Abrir ficha»), que lo dejaría
// atrás, pregunta en el pie.
function useSalidaDelPanel(estado: EstadoDelFormulario, alCerrar: () => void) {
  return useCierreConCambios({
    hayCambios: estado.hayCambios,
    alCerrar,
    alDescartar: estado.descartarBorrador,
  })
}

// Lo de adentro del panel. Se monta al abrirlo (y de nuevo si cambia la versión de lo que se
// edita): así cada apertura arranca de lo guardado y cada alta, con su id.
function Contenido({
  origen,
  campos,
  categorias,
  apibara,
  vehiculo,
  alCerrar,
  alCrear,
}: PropsDeContenido) {
  const idFormulario = useId()
  const router = useRouter()
  const { activos, fuentes } = useFuentesDelPanel({ origen, campos, categorias, vehiculo })
  // Tras «guardar y cargar otro» el foco vuelve al primer campo, pero recién cuando los campos
  // dejaron de estar deshabilitados por el envío.
  const volverAlTitulo = useRef(false)

  const subasta = useGuardadoDeSubasta(origen.id)

  function alGuardar(datos: Guardado) {
    const { id, seguir } = datos
    if (vehiculo) {
      avisarExito('Cambios guardados')
      alCerrar()
      return
    }
    avisarCreado(origen, datos, () => {
      router.push(`${RUTAS.vehiculos}/${id}` as Route)
    })
    subasta.despuesDeGuardar(datos)
    // Con varias líneas pegadas, guardar una no cierra el panel: quedan las demás.
    if (seguir || datos.subasta?.clave) {
      volverAlTitulo.current = seguir
    } else {
      alCrear()
    }
  }

  const estado = useFormularioDeVehiculo({
    origenId: origen.id,
    vehiculo,
    fuentes,
    activo: true,
    alGuardar,
  })

  const salida = useSalidaDelPanel(estado, alCerrar)
  useEffect(() => {
    if (!estado.enCurso && volverAlTitulo.current) {
      volverAlTitulo.current = false
      document.getElementById('titulo')?.focus()
    }
  }, [estado.enCurso, volverAlTitulo])

  return (
    <div className="grid gap-4">
      {vehiculo === null && origen.tipo === 'subasta' ? (
        <AltaPorSubasta
          origen={origen}
          campos={activos}
          fuentes={fuentes}
          estado={estado}
          apibara={apibara}
          traerFotos={subasta.traerFotos}
          guardado={subasta.guardado}
        />
      ) : null}
      <FormularioDeVehiculo
        id={idFormulario}
        estado={estado}
        fuentes={fuentes}
        campos={activos}
        vehiculo={vehiculo}
        alRecargar={() => {
          // Trae la versión de la otra persona: lo escrito acá se descarta a propósito.
          estado.descartarBorrador()
          router.refresh()
        }}
      />
      <PieDelPanel
        salida={salida}
        idFormulario={idFormulario}
        esAlta={vehiculo === null}
        enCurso={estado.enCurso}
        alCancelar={alCerrar}
        alGuardarYSeguir={() => void estado.enviar(true)}
      />
    </div>
  )
}

// El panel de alta y edición del inventario. Qué muestra lo dice la URL (`?panel=nuevo`,
// `?editar=<id>`). La tecla N abre «Nuevo» cuando la persona puede dar de alta y no hay otro
// panel abierto. Va una sola vez por pantalla.
export function PanelDeVehiculo({ puedeCrear, enEdicion, apibara, ...datos }: Props) {
  const panel = usePanelDeVehiculo()
  const { origen } = datos
  const editando = enEdicion !== null && panel.enEdicion === enEdicion.id ? enEdicion : null
  const creando = puedeCrear && panel.nuevoAbierto && editando === null
  const abierto = creando || editando !== null
  // Mientras se cierra, el panel sigue mostrando lo que tenía.
  const aLaVista = useUltimo(editando)
  const vehiculo = editando ?? (creando ? null : aLaVista)

  // `N` es de la pantalla: en el inventario abre «Nuevo» vehículo y, si no se puede (origen
  // desactivado, sin permiso, otro panel abierto), no hace nada: no cae a «Nuevo lead».
  useAtajo('nuevo', () => {
    if (puedeCrear && !abierto) {
      panel.abrirNuevo()
    }
  })

  const nuevo = `${concordar(origen.genero, { m: 'Nuevo', f: 'Nueva' })} ${origen.sustantivo}`
  return (
    <Drawer
      abierto={abierto}
      alCerrar={panel.cerrar}
      titulo={vehiculo ? `Editar ${vehiculo.titulo}` : nuevo}
      descripcion={`${origen.nombre}${vehiculo ? ` · #${String(vehiculo.numero)}` : ''}`}
      ancho="amplio"
      focoAlCerrar={focoAlCerrarElPanel}
    >
      <Contenido
        // Otra versión de lo que se edita (se recargó tras un conflicto) arranca de nuevo.
        key={vehiculo ? `${vehiculo.id}-${vehiculo.actualizadoEn}` : 'nuevo'}
        {...datos}
        apibara={apibara}
        vehiculo={vehiculo}
        alCerrar={panel.cerrar}
        alCrear={panel.cerrarYVolverAlPrincipio}
      />
    </Drawer>
  )
}
