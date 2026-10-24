// Lo que los e2e de Configuración › Empresa miran y restauran en la base del Supabase LOCAL. La
// empresa es una fila única y los tipos de cambio vienen sembrados: lo que un e2e les cambia se
// deja como en `supabase/seed.sql`.
import { createClient } from '@supabase/supabase-js'
import { admin, entorno } from './base'

type AjustesEnLaBase = {
  nombre: string
  zona_horaria: string
  telefono_cc: string | null
  logo_ruta: string | null
  iconos: Record<string, string> | null
}

// Los ajustes de la empresa como quedaron en la base.
export async function ajustesGuardados(): Promise<AjustesEnLaBase> {
  const { data, error } = await admin()
    .from('ajustes_empresa')
    .select('nombre, zona_horaria, telefono_cc, logo_ruta, iconos')
    .eq('id', 1)
    .single<AjustesEnLaBase>()
  if (error) {
    throw new Error(`No se pudo leer los ajustes: ${error.message}`)
  }
  return data
}

type CambioEnLaBase = { valor_anterior: number | null; valor_nuevo: number }

// El último cambio de valor de un tipo de cambio, leído del historial que escribe el trigger.
export async function ultimoCambioDe(clave: string): Promise<CambioEnLaBase | null> {
  const { data, error } = await admin()
    .from('tipos_cambio_historial')
    .select('valor_anterior, valor_nuevo, tipos_cambio!inner(clave)')
    .eq('tipos_cambio.clave', clave)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle<CambioEnLaBase>()
  if (error) {
    throw new Error(`No se pudo leer el historial de ${clave}: ${error.message}`)
  }
  return data
}

// Si apibara quedó con su secreto guardado y activa.
export async function estadoDeApibara(): Promise<{ activa: boolean; conSecreto: boolean }> {
  const { data, error } = await admin()
    .from('integraciones')
    .select('activa, secreto_guardado_en')
    .eq('clave', 'apibara')
    .single<{ activa: boolean; secreto_guardado_en: string | null }>()
  if (error) {
    throw new Error(`No se pudo leer la integración: ${error.message}`)
  }
  return { activa: data.activa, conSecreto: data.secreto_guardado_en !== null }
}

function exigir(error: { message: string } | null, que: string): void {
  if (error) {
    throw new Error(`No se pudo restaurar ${que}: ${error.message}`)
  }
}

type Fila = Record<string, unknown>

// Cómo estaba la empresa antes de que un e2e la tocara: sus ajustes, los tipos de cambio, dónde
// terminaba el historial y la integración de apibara (sin su clave: no se lee nunca). Con ella, al
// terminar se deja todo como estaba, para el spec que sigue en la misma corrida.
export type InstantaneaDeEmpresa = {
  ajustes: Fila
  tiposDeCambio: Fila[]
  ultimoHistorial: number
  apibara: { activa: boolean; config: unknown; secretoGuardadoEn: string | null }
}

export async function tomarInstantaneaDeEmpresa(): Promise<InstantaneaDeEmpresa> {
  const cliente = admin()
  const ajustes = await cliente.from('ajustes_empresa').select('*').eq('id', 1).single<Fila>()
  exigir(ajustes.error, 'los ajustes')
  const tipos = await cliente.from('tipos_cambio').select('*').returns<Fila[]>()
  exigir(tipos.error, 'los tipos de cambio')
  const historial = await cliente
    .from('tipos_cambio_historial')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
  exigir(historial.error, 'el historial')
  const integracion = await cliente
    .from('integraciones')
    .select('activa, config, secreto_guardado_en')
    .eq('clave', 'apibara')
    .single<{ activa: boolean; config: unknown; secreto_guardado_en: string | null }>()
  exigir(integracion.error, 'la integración')
  return {
    ajustes: ajustes.data as Fila,
    tiposDeCambio: tipos.data ?? [],
    ultimoHistorial: Number((historial.data?.[0] as { id?: number } | undefined)?.id ?? 0),
    apibara: {
      activa: integracion.data?.activa ?? false,
      config: integracion.data?.config ?? {},
      secretoGuardadoEn: integracion.data?.secreto_guardado_en ?? null,
    },
  }
}

// Deja la empresa como en `supabase/seed.sql` (para que el e2e arranque igual en cualquier base), o,
// con una instantánea, como estaba antes. Lo que un e2e subió al bucket `marca` se descarta.
export async function restaurarEmpresa(instantanea?: InstantaneaDeEmpresa): Promise<void> {
  const cliente = admin()
  const ajustes = await cliente
    .from('ajustes_empresa')
    .update(
      instantanea
        ? (({ id: _id, ...resto }) => resto)(instantanea.ajustes as Fila & { id: unknown })
        : {
            nombre: 'Mi importadora',
            razon_social: null,
            color_acento: null,
            logo_ruta: null,
            iconos: null,
            locale: 'es-BO',
            zona_horaria: 'America/La_Paz',
            registro_abierto: false,
            papelera_dias: 30,
            actividad_dias: 14,
            limpieza_automatica: true,
            limpieza_dias_gracia: 7,
          },
    )
    .eq('id', 1)
  exigir(ajustes.error, 'los ajustes')
  if (instantanea) {
    await restaurarTiposDeCambio(instantanea)
  } else {
    await dejarTiposDeCambioComoElSeed()
  }
  const integracion = instantanea
    ? {
        activa: instantanea.apibara.activa,
        config: instantanea.apibara.config,
        secreto_guardado_en: instantanea.apibara.secretoGuardadoEn,
      }
    : {
        activa: false,
        secreto_guardado_en: null,
        config: {
          plataformas: ['copart', 'iaai'],
          endpoint: 'https://apibara.tech/api/v1/vehicle-auction',
        },
      }
  const apibara = await cliente.from('integraciones').update(integracion).eq('clave', 'apibara')
  exigir(apibara.error, 'la integración')
  // Lo que un e2e subió al bucket `marca` ya no lo referencia nadie... salvo lo que la empresa
  // real usa: lo que referencian los ajustes que acaban de volver se queda.
  const enUso = new Set(
    [
      instantanea?.ajustes['logo_ruta'],
      ...Object.values(instantanea?.ajustes['iconos'] ?? {}),
    ].filter((ruta): ruta is string => typeof ruta === 'string'),
  )
  for (const carpeta of ['logos', 'iconos']) {
    const { data: objetos, error } = await cliente.storage.from('marca').list(carpeta)
    exigir(error, `la carpeta ${carpeta}`)
    const rutas = (objetos ?? [])
      .map((objeto) => `${carpeta}/${objeto.name}`)
      .filter((ruta) => !enUso.has(ruta))
    if (rutas.length > 0) {
      exigir((await cliente.storage.from('marca').remove(rutas)).error, `los objetos de ${carpeta}`)
    }
  }
}

// Los de supabase/seed.sql (los de las capturas del cotizador): el oficial es el único por defecto.
const TIPOS_DE_CAMBIO_DEL_SEED = [
  { clave: 'paralelo', nombre: 'Paralelo', valor: 12.2, es_default: false, orden: 1 },
  { clave: 'unificado', nombre: 'Unificado', valor: 12.2, es_default: false, orden: 2 },
  { clave: 'aduana', nombre: 'Aduana', valor: 11.68, es_default: false, orden: 3 },
  { clave: 'oficial', nombre: 'Oficial', valor: 11.68, es_default: true, orden: 0 },
] as const

async function dejarTiposDeCambioComoElSeed(): Promise<void> {
  const cliente = admin()
  const sobrantes = await cliente
    .from('tipos_cambio')
    .delete()
    .not('clave', 'in', `(${TIPOS_DE_CAMBIO_DEL_SEED.map((t) => t.clave).join(',')})`)
  exigir(sobrantes.error, 'los tipos de cambio')
  // Primero los que no son por defecto y al final el oficial: entre dos monedas sólo cabe uno por defecto.
  for (const t of TIPOS_DE_CAMBIO_DEL_SEED) {
    const fila = await cliente
      .from('tipos_cambio')
      .upsert({ ...t, moneda_de: 'USD', moneda_a: 'BOB', activo: true }, { onConflict: 'clave' })
    exigir(fila.error, `el tipo de cambio ${t.clave}`)
  }
  const historial = await cliente
    .from('tipos_cambio_historial')
    .delete()
    .not('valor_anterior', 'is', null)
  exigir(historial.error, 'el historial')
}

async function restaurarTiposDeCambio(instantanea: InstantaneaDeEmpresa): Promise<void> {
  const cliente = admin()
  const claves = instantanea.tiposDeCambio.map((fila) => String(fila['clave']))
  const sobrantes = await cliente
    .from('tipos_cambio')
    .delete()
    .not('clave', 'in', `(${claves.join(',')})`)
  exigir(sobrantes.error, 'los tipos de cambio')
  // Entre dos monedas sólo cabe uno por defecto: primero se desmarcan, después se vuelve a marcar.
  const sinDefecto: Fila[] = instantanea.tiposDeCambio.map((una) => ({ ...una, es_default: false }))
  for (const fila of [...sinDefecto, ...instantanea.tiposDeCambio]) {
    const { error } = await cliente.from('tipos_cambio').upsert(fila, { onConflict: 'clave' })
    exigir(error, `el tipo de cambio ${String(fila['clave'])}`)
  }
  // Lo que escribió el e2e en el historial; lo que ya había se queda.
  const historial = await cliente
    .from('tipos_cambio_historial')
    .delete()
    .gt('id', instantanea.ultimoHistorial)
  exigir(historial.error, 'el historial')
}

// Lo que responde la base cuando alguien que NO es el cliente de servicio pide el secreto de una
// integración: una persona con sesión (aunque sea la dueña) o nadie. Tiene que ser un rechazo. Es
// la prueba contra el Vault y los privilegios reales del Supabase local, no contra un doble.
export async function pedirSecreto(persona?: {
  email: string
  contrasena: string
}): Promise<{ codigo: string | null; dato: unknown }> {
  const cliente = createClient(
    entorno('NEXT_PUBLIC_SUPABASE_URL'),
    entorno('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  if (persona) {
    const { error } = await cliente.auth.signInWithPassword({
      email: persona.email,
      password: persona.contrasena,
    })
    if (error) {
      throw new Error(`No se pudo ingresar como ${persona.email}: ${error.message}`)
    }
  }
  const { data, error } = await cliente.rpc('integracion_secreto', { p_clave: 'apibara' })
  return { codigo: error?.code ?? null, dato: data as unknown }
}
