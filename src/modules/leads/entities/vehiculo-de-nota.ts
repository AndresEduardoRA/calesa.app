// El vehículo de un seguimiento o de un recordatorio (opcional). Se elige entre los vehículos del lead
// que quien escribe ve; la base vuelve a mirar que lo vea. Si después deja de verlo, la nota sigue sin
// el nombre: a su autor se le dice que había uno (para no pisarlo al editar), al resto nada.
import { z } from 'zod'

export type VehiculoDeNota = { id: string; titulo: string; numero: number }

export type VehiculoDeLaNota = {
  vehiculo: VehiculoDeNota | null
  // Tenía uno que quien mira ya no ve (sólo se le dice a su autor).
  vehiculoOculto: boolean
}

export const SIN_VEHICULO: VehiculoDeLaNota = { vehiculo: null, vehiculoOculto: false }

// Los valores del selector: vacío = ninguno; `oculto` = conservar el que ya no se ve; si no, el id.
export const VALOR_SIN_VEHICULO = ''
export const VALOR_OCULTO = 'oculto'
export const ROTULO_DE_OCULTO = 'Un vehículo que ya no ves'

const vehiculo = z.object({ id: z.guid(), titulo: z.string(), numero: z.number() })

// Una RPC lo entrega anidado (`vehiculo`, `vehiculo_oculto`); `recordatorios_vista`, en columnas
// (`vehiculo_id`, `vehiculo_titulo`, `vehiculo_numero`, `vehiculo_oculto`). Lo que falta es «sin vehículo».
const esquema = z.object({
  vehiculo: vehiculo.nullable().optional(),
  vehiculo_id: z.guid().nullable().optional(),
  vehiculo_titulo: z.string().nullable().optional(),
  vehiculo_numero: z.number().nullable().optional(),
  vehiculo_oculto: z.boolean().optional(),
})

export function vehiculoDeNotaDesde(crudo: unknown): VehiculoDeLaNota {
  const leido = esquema.safeParse(crudo)
  if (!leido.success) {
    return SIN_VEHICULO
  }
  const f = leido.data
  const plano =
    f.vehiculo_id && f.vehiculo_titulo != null && f.vehiculo_numero != null
      ? { id: f.vehiculo_id, titulo: f.vehiculo_titulo, numero: f.vehiculo_numero }
      : null
  return { vehiculo: f.vehiculo ?? plano, vehiculoOculto: f.vehiculo_oculto ?? false }
}

// Con qué arranca el selector al editar (vacío al anotar uno nuevo).
export function valorDeVehiculo(nota: VehiculoDeLaNota | null): string {
  if (!nota) {
    return VALOR_SIN_VEHICULO
  }
  if (nota.vehiculo) {
    return nota.vehiculo.id
  }
  return nota.vehiculoOculto ? VALOR_OCULTO : VALOR_SIN_VEHICULO
}

// Lo que se manda: al anotar, el id o nulo; al editar, sólo si cambió (`oculto` es no tocarlo).
export function vehiculoAlCrear(valor: string): string | null {
  return valor === VALOR_SIN_VEHICULO || valor === VALOR_OCULTO ? null : valor
}

export function cambioDeVehiculo(
  valor: string,
  original: VehiculoDeLaNota,
): { cambia: false } | { cambia: true; vehiculoId: string | null } {
  if (valor === valorDeVehiculo(original)) {
    return { cambia: false }
  }
  return { cambia: true, vehiculoId: vehiculoAlCrear(valor) }
}

// «Toyota Corolla · #12».
export function rotuloDeVehiculoDeNota(v: VehiculoDeNota): string {
  return `${v.titulo} · #${String(v.numero)}`
}

// Lo que ofrece el selector: «Ninguno», los vehículos del lead que quien mira ve y, al editar, el que
// la nota ya tiene aunque ya no esté entre ellos (o «Un vehículo que ya no ves»).
export function opcionesDeVehiculo(
  delLead: readonly VehiculoDeNota[],
  actual: VehiculoDeLaNota | null,
): { valor: string; rotulo: string }[] {
  const opciones = [{ valor: VALOR_SIN_VEHICULO, rotulo: 'Ninguno' }]
  if (actual?.vehiculoOculto && !actual.vehiculo) {
    opciones.push({ valor: VALOR_OCULTO, rotulo: ROTULO_DE_OCULTO })
  }
  const lista =
    actual?.vehiculo && !delLead.some((v) => v.id === actual.vehiculo?.id)
      ? [actual.vehiculo, ...delLead]
      : delLead
  return [...opciones, ...lista.map((v) => ({ valor: v.id, rotulo: rotuloDeVehiculoDeNota(v) }))]
}

// Cómo se nombra en la línea de tiempo y en «Tus recordatorios»; null = sin vehículo (o no se dice).
export function nombreDelVehiculoDeNota(nota: VehiculoDeLaNota): string | null {
  if (nota.vehiculo) {
    return rotuloDeVehiculoDeNota(nota.vehiculo)
  }
  return nota.vehiculoOculto ? 'un vehículo que ya no ves' : null
}
