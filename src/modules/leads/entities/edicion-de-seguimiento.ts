// Anotar y editar un seguimiento en su modal (`?panel=anotar-seguimiento` y `?panel=editar-seguimiento&
// seguimiento=<id>`): qué abre la URL, con qué arranca, cuándo hay algo que perder y qué hacer cuando
// llega otra versión. Puro: lo usan la ficha, la pestaña del drawer y la tabla.
import { localDeInstante } from '@/shared/lib/fechas'
import type { TipoDeSeguimiento } from './alta'
import { documentoInicial, type Seguimiento, type ValoresDelSeguimiento } from './seguimiento'
import { valoresDeSeguimientoNuevo } from './seguimiento-nuevo'
import { valorDeVehiculo } from './vehiculo-de-nota'

export const PANEL_ANOTAR_SEGUIMIENTO = 'anotar-seguimiento'
export const PANEL_EDITAR_SEGUIMIENTO = 'editar-seguimiento'
// La clave del id que se edita: `?panel=editar-seguimiento&seguimiento=<id>`.
export const CLAVE_DE_SEGUIMIENTO = 'seguimiento'

export const MENSAJE_SIN_TIPOS_DE_SEGUIMIENTO = 'No hay tipos de seguimiento activos.'

// Lo que se busca más allá de lo cargado antes de decir que no está (5 páginas de 20).
export const PAGINAS_PARA_BUSCAR_UN_SEGUIMIENTO = 5

export type SeguimientoParaEditar =
  { tipo: 'editable'; seguimiento: Seguimiento } | { tipo: 'no_esta' }

// El de `?seguimiento=<id>` entre los cargados. Sólo se edita lo propio y con el lead en la cartera:
// uno ajeno, eliminado, inventado o mal escrito «no está», todos igual (decir «es de otra persona»
// confirmaría un privado ajeno).
export function seguimientoParaEditar(
  lista: readonly Seguimiento[],
  id: string,
  puedoAnotar: boolean,
): SeguimientoParaEditar {
  const seguimiento = lista.find((s) => s.id === id)
  return seguimiento && seguimiento.esMio && puedoAnotar
    ? { tipo: 'editable', seguimiento }
    : { tipo: 'no_esta' }
}

// Con qué arranca el modal: el primer tipo activo y nada escrito al anotar; lo guardado al editar (la
// fecha en la zona de la empresa, el detalle como documento aunque viniera como texto del alta).
export function valoresDelSeguimiento(
  original: Seguimiento | null,
  tipos: readonly TipoDeSeguimiento[],
  zona: string,
): ValoresDelSeguimiento {
  if (!original) {
    return valoresDeSeguimientoNuevo(tipos)
  }
  return {
    tipoId: original.tipoId,
    titulo: original.titulo,
    detalle: documentoInicial(original),
    visible: original.visibilidad === 'publico',
    ocurridoEn: localDeInstante(original.ocurridoEn, { zona }),
    recordatorio: '',
    vehiculo: valorDeVehiculo(original),
  }
}

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// Cerrar ahora perdería algo: lo escrito difiere de con qué arrancó (también cambiar sólo el tipo).
export function hayCambiosEnSeguimiento(
  valores: ValoresDelSeguimiento,
  inicial: ValoresDelSeguimiento,
): boolean {
  return !igual(valores, inicial)
}

// Llegó otra versión (tras «Recargar»): lo que la persona no tocó toma lo nuevo; lo que cambió se
// queda. Así guardar no pisa con lo viejo un campo que cambió la otra ventana. El detalle es un
// documento: se compara por contenido.
export function seguimientoConVersionNueva(
  valores: ValoresDelSeguimiento,
  antes: ValoresDelSeguimiento,
  ahora: ValoresDelSeguimiento,
): ValoresDelSeguimiento {
  const campo = <K extends keyof ValoresDelSeguimiento>(clave: K): ValoresDelSeguimiento[K] =>
    igual(valores[clave], antes[clave]) ? ahora[clave] : valores[clave]
  return {
    tipoId: campo('tipoId'),
    titulo: campo('titulo'),
    detalle: campo('detalle'),
    visible: campo('visible'),
    ocurridoEn: campo('ocurridoEn'),
    recordatorio: campo('recordatorio'),
    vehiculo: campo('vehiculo'),
  }
}

// Dónde queda lo escrito y no guardado (en la pestaña): uno por lead al anotar, uno por seguimiento al
// editar. Las mismas claves que usaba el redactor en línea: un borrador viejo vuelve igual.
export function claveDelBorradorDeSeguimiento(
  leadId: string,
  original: Seguimiento | null,
): string {
  return original ? `seguimiento-${original.id}` : `seguimiento-nuevo-${leadId}`
}
