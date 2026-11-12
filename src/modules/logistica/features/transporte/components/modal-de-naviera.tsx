'use client'

import { Campo } from '@/shared/ui/campo'
import { Interruptor } from '@/shared/ui/interruptor'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import {
  LARGO_MAXIMO_DE_NOMBRE_DE_TRANSPORTE,
  type NavieraDeCatalogo,
} from '../../../entities/transporte/catalogo'
import { useFormularioDeNaviera } from '../hooks/use-formulario-de-naviera'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // Nulo = «Nueva naviera».
  original: NavieraDeCatalogo | null
  // Ya no se puede guardar lo escrito (otra persona la quitó mientras se editaba).
  noDisponible: string | null
  alGuardar: () => void
}

const ID_DEL_NOMBRE = 'naviera-nombre'

// «Nueva naviera» y «Editar» de una naviera (`?panel=nueva-naviera`, `?panel=editar-naviera&naviera=`): nombre y si está activa. Quien lo monta le da una `key` por apertura: cada una empieza de cero.
export function ModalDeNaviera({ abierto, alCerrar, original, noDisponible, alGuardar }: Props) {
  const f = useFormularioDeNaviera({ original, abierto, alCerrar, alGuardar })
  return (
    <ModalDeFormulario
      id="naviera"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={original ? 'Editar naviera' : 'Nueva naviera'}
      descripcion="Es la que se elige al cargar el transporte de una unidad."
      focoInicial={() => document.getElementById(ID_DEL_NOMBRE)}
      formulario={f}
      noDisponible={noDisponible}
      guardar={
        original
          ? { etiqueta: 'Guardar', enCurso: 'Guardando…' }
          : { etiqueta: 'Crear naviera', enCurso: 'Creando…' }
      }
    >
      <Campo
        nombre={ID_DEL_NOMBRE}
        etiqueta="Nombre"
        autoComplete="off"
        maxLength={LARGO_MAXIMO_DE_NOMBRE_DE_TRANSPORTE + 20}
        value={f.valores.nombre}
        onChange={(evento) => {
          f.escribir({ nombre: evento.target.value })
        }}
        error={f.errores['nombre']}
        ayuda={`Hasta ${String(LARGO_MAXIMO_DE_NOMBRE_DE_TRANSPORTE)} caracteres. Dos navieras no pueden llamarse igual.`}
      />
      <Interruptor
        titulo="Activa"
        ayuda="Una naviera desactivada deja de ofrecerse en lo nuevo; no cambia lo ya cargado ni la oferta del flujo."
        valor={f.valores.activo}
        alCambiar={(activo) => {
          f.escribir({ activo })
        }}
      />
    </ModalDeFormulario>
  )
}
