// Lo que el editor de campos necesita saber del módulo que lo usa. El editor es el mismo para el
// layout de un origen y para el de los leads: cada módulo le pasa su configuración (qué banderas
// ofrece, cómo arma lo que viaja) y sus operaciones (las Server Actions por detrás).
import type { ReactNode } from 'react'
import type { Resultado } from '@/shared/lib/errores'
import type {
  CampoBase,
  ImpactoDeCampo,
  OpcionDeCampo,
  ResumenDeImpacto,
  TipoDeCampo,
  ValorDefecto,
} from '@/shared/lib/campos'

// Un sí o no del campo que el módulo ofrece (en tarjeta, filtrable, solo la cartera…). `clave` es
// el nombre de la propiedad del campo. `enFila` = guarda sola desde el interruptor de la fila.
export type BanderaDeCampo = {
  clave: string
  etiqueta: string
  ayuda: string
  enFila: boolean
}

// La propiedad booleana de un campo del módulo.
export function banderaDe(campo: object, clave: string): boolean {
  return Reflect.get(campo, clave) === true
}

// Lo que el formulario de un campo edita. Las banderas y los textos propios del módulo (la ruta de
// apibara) viajan en mapas: el editor no conoce sus nombres.
export type ValoresDeCampo = {
  etiqueta: string
  clave: string
  tipo: TipoDeCampo
  opciones: OpcionDeCampo[]
  grupo: string
  activo: boolean
  valorDefecto: ValorDefecto | null
  banderas: Record<string, boolean>
  textos: Record<string, string>
}

export type ErroresDeCampo = Partial<
  Record<'etiqueta' | 'clave' | 'opciones' | 'grupo' | 'valorDefecto', string>
>

export type DeLaFila = Pick<CampoBase, 'id' | 'etiqueta' | 'actualizadoEn'>

// Las operaciones: las del `useCampos()` de cada módulo. Toda edición manda la versión que vio.
export type EdicionesDeCampos<Cambios, Nuevo> = {
  crear: (nuevo: Nuevo) => Promise<Resultado<unknown>>
  guardar: (campo: DeLaFila, cambios: Cambios) => Promise<Resultado<unknown>>
  // Una bandera: sin aviso, el interruptor ya lo dice.
  cambiarBandera: (campo: DeLaFila, cambios: Cambios) => Promise<Resultado<unknown>>
  cambiarActivo: (campo: DeLaFila, activo: boolean) => Promise<Resultado<unknown>>
  mover: (campo: DeLaFila, despuesDe: string | null) => Promise<Resultado<unknown>>
  eliminar: (campo: DeLaFila) => Promise<Resultado<unknown>>
  // Cuántos registros tienen valor: se llama antes de un cambio que podría tocarlos.
  vistaPrevia: (campoId: string) => Promise<Resultado<ImpactoDeCampo>>
  enCurso: boolean
  errores: { crear: Partial<Record<string, string[]>> | undefined }
}

export type TextosDelEditor = {
  // El encabezado del editor y lo que dice sin campos activos.
  titulo: string
  vacioTitulo: string
  vacioDescripcion: string
  // Por qué todo está apagado sin el permiso.
  motivoSinPermiso: string
  // El panel de un campo.
  panelNuevo: string
  panelDescripcionNuevo: string
  panelDescripcionExistente: string
  // Un nombre que choca con otro campo.
  claveDuplicada: string
  // La clave del borrador del formulario (`sessionStorage`).
  borrador: string
}

export type ContextoDelHueco = {
  valores: ValoresDeCampo
  cambiarTexto: (nombre: string, valor: string) => void
  deshabilitado: boolean
}

export type ConfiguracionDeCampos<Campo extends CampoBase, Cambios extends object, Nuevo> = {
  textos: TextosDelEditor
  // En el orden del panel; las de `enFila` también salen en la fila.
  banderas: readonly BanderaDeCampo[]
  // Los tipos que ofrece el selector.
  tipos: readonly TipoDeCampo[]
  // Nombres de los textos propios del módulo (para el borrador del formulario).
  textosLibres: readonly string[]
  valoresIniciales: (campo: Campo | null) => ValoresDeCampo
  claveDe: (etiqueta: string, existentes: readonly string[]) => string
  // `valores.clave` ya es la definitiva.
  paraCrear: (valores: ValoresDeCampo) => Nuevo
  // Sólo lo que la persona cambió respecto de lo guardado.
  cambiosDe: (campo: Campo, valores: ValoresDeCampo) => Cambios
  conBandera: (clave: string, valor: boolean) => Cambios
  necesitaVistaPrevia: (campo: Campo, cambios: Cambios) => boolean
  resumenDeImpacto: (campo: Campo, cambios: Cambios, impacto: ImpactoDeCampo) => ResumenDeImpacto
  resumenDeEliminacion: (campo: Campo, impacto: ImpactoDeCampo) => ResumenDeImpacto
  // Un hueco del formulario para lo propio del módulo (el bloque de apibara).
  hueco?: (contexto: ContextoDelHueco) => ReactNode
}
