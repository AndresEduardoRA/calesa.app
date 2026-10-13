'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useMemo, useRef } from 'react'
import {
  concordar,
  type CampoDeLayout,
  type Categoria,
  type OrigenResumen,
} from '@/modules/origenes/client'
import { RUTAS } from '@/shared/lib/rutas'
import { useAtajo } from '@/shared/ui/atajos'
import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { useRegional } from '@/shared/ui/regional'
import { avisarExito } from '@/shared/ui/toasts'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { camposActivos } from '../../../entities/campo'
import { camposComunes } from '../../../entities/comunes'
import type { Fuentes } from '../../../entities/esquema'
import type { Vehiculo } from '../../../entities/vehiculo'
import { useFormularioDeVehiculo, type Guardado } from '../hooks/use-formulario-de-vehiculo'
import { usePanelDeVehiculo } from '../hooks/use-panel-de-vehiculo'
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
}

const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)

type PropsDeContenido = Datos & {
  vehiculo: Vehiculo | null
  alCerrar: () => void
  alCrear: () => void
}

type PropsDelPie = {
  idFormulario: string
  esAlta: boolean
  enCurso: boolean
  alCancelar: () => void
  alGuardarYSeguir: () => void
}

// Los botones del panel, siempre a la vista al pie aunque el formulario sea largo. El panel
// desplaza su contenido con un relleno de 1rem y «pegajoso» se mide contra el borde de adentro:
// `-bottom-4` lo lleva hasta el borde de verdad, para que no se vea contenido por debajo.
function PieDelPanel({ idFormulario, esAlta, enCurso, alCancelar, alGuardarYSeguir }: PropsDelPie) {
  return (
    <div className="sticky -bottom-4 -mx-4 -mb-4 flex flex-wrap justify-end gap-2 border-t border-(--color-line) bg-(--color-surface) p-4">
      <Button variant="ghost" onClick={alCancelar} disabled={enCurso}>
        Cancelar
      </Button>
      {esAlta ? (
        <Button variant="outline" onClick={alGuardarYSeguir} disabled={enCurso}>
          Guardar y cargar otro
        </Button>
      ) : null}
      <Button type="submit" form={idFormulario} disabled={enCurso}>
        {enCurso ? 'Guardando…' : 'Guardar'}
      </Button>
    </div>
  )
}

// Lo de adentro del panel. Se monta al abrirlo (y de nuevo si cambia la versión de lo que se
// edita): así cada apertura arranca de lo guardado y cada alta, con su id.
function Contenido({ origen, campos, categorias, vehiculo, alCerrar, alCrear }: PropsDeContenido) {
  const idFormulario = useId()
  // Tras «guardar y cargar otro» el foco vuelve al primer campo, pero recién cuando los campos
  // dejaron de estar deshabilitados por el envío.
  const volverAlTitulo = useRef(false)
  const router = useRouter()
  const { zonaHoraria } = useRegional()
  const activos = useMemo(() => camposActivos(campos), [campos])
  const fuentes = useMemo<Fuentes>(
    () => ({
      comunes: camposComunes(origen.tipo),
      campos: activos,
      categorias,
      zona: zonaHoraria,
      ...(vehiculo
        ? { actuales: { atributos: vehiculo.atributos, categoriaId: vehiculo.categoriaId } }
        : {}),
    }),
    [origen.tipo, activos, categorias, zonaHoraria, vehiculo],
  )

  function alGuardar({ id, numero, seguir }: Guardado) {
    if (vehiculo) {
      avisarExito('Cambios guardados')
      alCerrar()
      return
    }
    const creado = concordar(origen.genero, { m: 'creado', f: 'creada' })
    avisarExito(`${mayuscula(origen.sustantivo)} #${String(numero ?? '')} ${creado}`, {
      etiqueta: 'Abrir ficha',
      alHacer: () => {
        router.push(`${RUTAS.vehiculos}/${id}` as Route)
      },
    })
    if (seguir) {
      volverAlTitulo.current = true
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

  const { enCurso } = estado
  useEffect(() => {
    if (!enCurso && volverAlTitulo.current) {
      volverAlTitulo.current = false
      document.getElementById('titulo')?.focus()
    }
  }, [enCurso, volverAlTitulo])

  return (
    <div className="grid gap-4">
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
        idFormulario={idFormulario}
        esAlta={vehiculo === null}
        enCurso={enCurso}
        alCancelar={alCerrar}
        alGuardarYSeguir={() => void estado.enviar(true)}
      />
    </div>
  )
}

// El panel de alta y edición del inventario. Qué muestra lo dice la URL (`?panel=nuevo`,
// `?editar=<id>`). La tecla N abre «Nuevo» cuando la persona puede dar de alta y no hay otro
// panel abierto. Va una sola vez por pantalla.
export function PanelDeVehiculo({ puedeCrear, enEdicion, ...datos }: Props) {
  const panel = usePanelDeVehiculo()
  const { origen } = datos
  const editando = enEdicion !== null && panel.enEdicion === enEdicion.id ? enEdicion : null
  const creando = puedeCrear && panel.nuevoAbierto && editando === null
  const abierto = creando || editando !== null
  // Mientras se cierra, el panel sigue mostrando lo que tenía.
  const aLaVista = useUltimo(editando)
  const vehiculo = editando ?? (creando ? null : aLaVista)

  useAtajo('nuevo', panel.abrirNuevo, puedeCrear && !abierto)

  const nuevo = `${concordar(origen.genero, { m: 'Nuevo', f: 'Nueva' })} ${origen.sustantivo}`
  return (
    <Drawer
      abierto={abierto}
      alCerrar={panel.cerrar}
      titulo={vehiculo ? `Editar ${vehiculo.titulo}` : nuevo}
      descripcion={`${origen.nombre}${vehiculo ? ` · #${String(vehiculo.numero)}` : ''}`}
      ancho="amplio"
    >
      <Contenido
        // Otra versión de lo que se edita (se recargó tras un conflicto) arranca de nuevo.
        key={vehiculo ? `${vehiculo.id}-${vehiculo.actualizadoEn}` : 'nuevo'}
        {...datos}
        vehiculo={vehiculo}
        alCerrar={panel.cerrar}
        alCrear={panel.cerrarYVolverAlPrincipio}
      />
    </Drawer>
  )
}
