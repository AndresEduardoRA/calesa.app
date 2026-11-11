'use client'

import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { LARGO_MAXIMO_DEL_NOMBRE_DE_FASE } from '../../../entities/fases/reglas-de-fase'
import {
  TEXTO_DEL_TIPO_DE_FASE,
  TIPOS_DE_FASE_NUEVA,
} from '../../../entities/fases/formulario-de-fase'
import { useFormularioDeNuevaFase } from '../hooks/use-formulario-de-nueva-fase'
import type { ListaDeFasesEnPantalla } from '../hooks/use-lista-de-fases'
import { SelectorDeColor } from './selector-de-color'

type Props = {
  abierto: boolean
  alCerrar: () => void
  lista: ListaDeFasesEnPantalla
}

const ID_DEL_FORMULARIO = 'nueva-fase'
const ID_DEL_NOMBRE = 'nombre-de-la-fase'
const ID_DEL_COLOR = 'color-de-la-fase'

const AYUDA_DEL_TIPO: Record<(typeof TIPOS_DE_FASE_NUEVA)[number], string> = {
  intermedia: 'Una fase del camino.',
  inicial: 'Donde puede nacer una unidad.',
  final: 'Donde termina el camino.',
}

// «Nueva fase» (`?panel=nueva-fase`): sólo lo mínimo (nombre, color y si es inicial o final); la fase se crea al final del flujo y el resto se edita en el
// inspector. El contrato del modal (preguntar antes de cerrar con algo escrito, no cerrarse mientras guarda, el conflicto con «Recargar») es de
// `ModalDeFormulario`. Quien lo monta le da una `key` por apertura: cada una empieza de cero, con un id de intento nuevo.
export function ModalDeNuevaFase({ abierto, alCerrar, lista }: Props) {
  const f = useFormularioDeNuevaFase({ lista, alCerrar, abierto })
  const { valores } = f

  return (
    <ModalDeFormulario
      id={ID_DEL_FORMULARIO}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Nueva fase"
      descripcion="Se agrega al final del flujo. Lo demás lo ajustas después, al abrirla."
      focoInicial={() => document.getElementById(ID_DEL_NOMBRE)}
      formulario={f}
      detalleDelConflicto="Lo que escribiste sigue acá."
      guardar={{ etiqueta: 'Crear fase', enCurso: 'Creando…' }}
    >
      <Campo
        nombre={ID_DEL_NOMBRE}
        etiqueta="Nombre"
        autoComplete="off"
        maxLength={LARGO_MAXIMO_DEL_NOMBRE_DE_FASE + 20}
        value={valores.nombre}
        onChange={(evento) => {
          f.escribir({ nombre: evento.target.value }, 'nombre')
        }}
        error={f.errores['nombre']}
        ayuda={`Hasta ${String(LARGO_MAXIMO_DEL_NOMBRE_DE_FASE)} caracteres. Dos fases del mismo flujo no pueden llamarse igual.`}
      />
      <SelectorDeColor
        valor={valores.color}
        idDelPrimero={ID_DEL_COLOR}
        error={f.errores['color']}
        alElegir={(color) => {
          f.escribir({ color }, 'color')
        }}
      />
      <fieldset className="grid min-w-0 gap-1.5">
        <legend className="mb-1 text-(length:--text-sm) font-medium text-(--color-ink)">
          Tipo
        </legend>
        {TIPOS_DE_FASE_NUEVA.map((tipo) => (
          <label key={tipo} className="flex min-h-[44px] cursor-pointer items-center gap-3">
            <input
              type="radio"
              name="tipo-de-la-fase"
              value={tipo}
              checked={valores.tipo === tipo}
              className="size-4 shrink-0 accent-(--color-primario)"
              onChange={() => {
                f.escribir({ tipo }, 'tipo')
              }}
            />
            <span className="grid min-w-0">
              <span className="text-(length:--text-sm) font-medium text-(--color-ink)">
                {TEXTO_DEL_TIPO_DE_FASE[tipo]}
              </span>
              <span className="text-(length:--text-sm) text-(--color-ink-faint)">
                {AYUDA_DEL_TIPO[tipo]}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
    </ModalDeFormulario>
  )
}
