'use client'

import { enfocarPrimerError, errorDeCampo } from '@/shared/lib/formularios'
import { Aviso } from '@/shared/ui/aviso'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { Drawer } from '@/shared/ui/drawer'
import { Interruptor } from '@/shared/ui/interruptor'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { Categoria } from '../../../entities/categoria'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../entities/motivos'
import type { EdicionesDeCategorias } from '../hooks/use-categorias'
import { useFormularioDeCategoria } from '../hooks/use-formulario-de-categoria'
import { PieDeCategoria } from './pie-de-categoria'

type Props = {
  // 'nueva' para crear, la categoría de `?categoria=` para editar, null con el panel cerrado.
  categoria: Categoria | 'nueva' | null
  origenId: string
  // Las de primer nivel: sólo una de ellas puede ser padre.
  raices: readonly Categoria[]
  hijasDe: (id: string) => readonly Categoria[]
  puedeGestionar: boolean
  ediciones: EdicionesDeCategorias
  alCerrar: () => void
}

type PropsDelFormulario = Omit<Props, 'categoria'> & { categoria: Categoria | null }

type PropsDeCampos = {
  esNueva: boolean
  deshabilitado: boolean
  raices: readonly Categoria[]
  formulario: ReturnType<typeof useFormularioDeCategoria>
  errorDeValidacion: string | undefined
}

function CamposDeCategoria(props: PropsDeCampos) {
  const { esNueva, deshabilitado, raices, formulario, errorDeValidacion } = props
  return (
    <>
      <Campo
        nombre="nombre"
        etiqueta="Nombre"
        autoComplete="off"
        maxLength={60}
        value={formulario.nombre}
        onChange={(evento) => {
          formulario.cambiarNombre(evento.target.value)
        }}
        error={formulario.errorDeNombre ?? errorDeValidacion}
      />
      {esNueva ? (
        <CampoSeleccion
          nombre="padre"
          etiqueta="Dentro de"
          opciones={[
            { valor: '', etiqueta: 'Ninguna: de primer nivel' },
            ...raices.map((raiz) => ({ valor: raiz.id, etiqueta: raiz.nombre })),
          ]}
          value={formulario.padreId}
          onChange={(evento) => {
            formulario.setPadreId(evento.target.value)
          }}
          ayuda="Una categoría puede estar dentro de otra, pero sólo un nivel."
        />
      ) : (
        <Interruptor
          titulo="Activa"
          ayuda="Una categoría inactiva no se ofrece al cargar vehículos; los que ya la tienen la conservan."
          valor={formulario.activa}
          alCambiar={formulario.setActiva}
          // Un fieldset deshabilitado no apaga los controles de Base UI.
          deshabilitado={deshabilitado}
        />
      )}
    </>
  )
}

function Formulario(props: PropsDelFormulario) {
  const { categoria, origenId, raices, hijasDe, puedeGestionar, ediciones, alCerrar } = props
  const formulario = useFormularioDeCategoria({
    categoria,
    origenId,
    hijas: categoria ? hijasDe(categoria.id) : [],
    ediciones,
    alTerminar: alCerrar,
  })
  useCambiosSinGuardar(puedeGestionar && formulario.hayCambios)

  async function enviar(elemento: HTMLFormElement) {
    if (!(await formulario.guardar())) {
      enfocarPrimerError(elemento)
    }
  }

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(evento) => {
        evento.preventDefault()
        void enviar(evento.currentTarget)
      }}
    >
      <fieldset disabled={!puedeGestionar} className="grid min-w-0 gap-4">
        <legend className="sr-only">
          {categoria ? `Categoría ${categoria.nombre}` : 'Categoría nueva'}
        </legend>
        {puedeGestionar ? null : <Aviso>{MOTIVO_SIN_PERMISO_ORIGENES}</Aviso>}
        <CamposDeCategoria
          esNueva={categoria === null}
          deshabilitado={!puedeGestionar}
          raices={raices}
          formulario={formulario}
          errorDeValidacion={errorDeCampo(ediciones.errores.crear, 'nombre')}
        />
      </fieldset>
      {formulario.eliminando ? (
        <Aviso tono="aviso">Se elimina «{categoria?.nombre}». No se puede deshacer.</Aviso>
      ) : null}
      {formulario.motivoNoEliminar ? (
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">
          {formulario.motivoNoEliminar}
        </p>
      ) : null}
      {puedeGestionar ? (
        <PieDeCategoria
          esNueva={categoria === null}
          puedeEliminar={categoria !== null && formulario.motivoNoEliminar === null}
          eliminando={formulario.eliminando}
          enCurso={ediciones.enCurso}
          alCancelar={alCerrar}
          alPedirEliminar={formulario.pedirEliminar}
          alConfirmarEliminar={() => void formulario.eliminar()}
        />
      ) : null}
    </form>
  )
}

// Crear una categoría o editar una que ya existe, con su URL (`?categoria=`).
export function PanelDeCategoria({ categoria, ...resto }: Props) {
  const aLaVista = useUltimo(categoria)
  const existente = aLaVista === 'nueva' ? null : aLaVista
  return (
    <Drawer
      abierto={categoria !== null}
      alCerrar={resto.alCerrar}
      titulo={existente ? existente.nombre : 'Categoría nueva'}
      descripcion="Agrupa los vehículos de este origen: marcas, segmentos, medio uso."
    >
      {aLaVista ? (
        <Formulario
          key={existente ? `${existente.id}-${existente.actualizadoEn}` : 'nueva'}
          categoria={existente}
          {...resto}
        />
      ) : null}
    </Drawer>
  )
}
