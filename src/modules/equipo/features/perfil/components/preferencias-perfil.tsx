'use client'

import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'
import { Bloque } from '@/shared/ui/bloque'
import { useDensidad, type Densidad } from '@/shared/ui/densidad'
import { Opciones } from '@/shared/ui/opciones'
import { TEMAS, type Tema } from '../../../entities/preferencias'

const OPCIONES_TEMA = [
  { valor: 'light', etiqueta: 'Claro' },
  { valor: 'dark', etiqueta: 'Oscuro' },
  { valor: 'system', etiqueta: 'Como el dispositivo' },
] as const satisfies readonly { valor: Tema; etiqueta: string }[]

type OpcionDensidad = Densidad | 'automatica'

const OPCIONES_DENSIDAD = [
  { valor: 'automatica', etiqueta: 'Automática' },
  { valor: 'compacta', etiqueta: 'Compacta' },
  { valor: 'comoda', etiqueta: 'Cómoda' },
] as const satisfies readonly { valor: OpcionDensidad; etiqueta: string }[]

const sinSuscripcion = () => () => undefined

// Guardar no hace falta: cada cambio se aplica al instante y lo persiste <ProveedorPreferencias>.
export function PreferenciasPerfil() {
  const { theme, setTheme } = useTheme()
  const { preferencia, cambiar } = useDensidad()
  // El tema vive en el navegador: en el servidor no se sabe cuál es, así que se marca al montar.
  const montado = useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  )
  const tema = montado ? (TEMAS.find((opcion) => opcion === theme) ?? null) : null

  return (
    <Bloque titulo="Preferencias" descripcion="Valen para tu cuenta, en cualquier dispositivo.">
      <Opciones etiqueta="Tema" opciones={OPCIONES_TEMA} valor={tema} alCambiar={setTheme} />
      <Opciones
        etiqueta="Densidad"
        ayuda="Automática: compacta con mouse, cómoda en pantallas táctiles."
        opciones={OPCIONES_DENSIDAD}
        valor={preferencia ?? 'automatica'}
        alCambiar={(valor) => {
          cambiar(valor === 'automatica' ? null : valor)
        }}
      />
    </Bloque>
  )
}
