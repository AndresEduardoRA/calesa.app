// Lo que los e2e de Configuración › Empresa miran y restauran en la base del Supabase LOCAL. La
// empresa es una fila única y los tipos de cambio vienen sembrados: lo que un e2e les cambia se
// deja como en `supabase/seed.sql`.
import { createClient } from '@supabase/supabase-js'
import { admin, entorno } from './base'

type AjustesEnLaBase = {
  nombre: string
  zona_horaria: string
  logo_ruta: string | null
  iconos: Record<string, string> | null
}

// Los ajustes de la empresa como quedaron en la base.
export async function ajustesGuardados(): Promise<AjustesEnLaBase> {
  const { data, error } = await admin()
    .from('ajustes_empresa')
    .select('nombre, zona_horaria, logo_ruta, iconos')
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

// La empresa es una fila única y los tipos de cambio vienen sembrados: lo que un e2e les cambia
// se deja como en `supabase/seed.sql`, para que el siguiente (y el otro proyecto) arranquen igual.
export async function restaurarEmpresa(): Promise<void> {
  const cliente = admin()
  const ajustes = await cliente
    .from('ajustes_empresa')
    .update({
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
    })
    .eq('id', 1)
  exigir(ajustes.error, 'los ajustes')
  const sobrantes = await cliente
    .from('tipos_cambio')
    .delete()
    .not('clave', 'in', '(oficial,paralelo)')
  exigir(sobrantes.error, 'los tipos de cambio')
  // Primero se desmarca el que no es por defecto: entre dos monedas sólo cabe uno.
  const paralelo = await cliente
    .from('tipos_cambio')
    .update({ nombre: 'Paralelo', valor: 12.4, activo: true, es_default: false })
    .eq('clave', 'paralelo')
  exigir(paralelo.error, 'el paralelo')
  const oficial = await cliente
    .from('tipos_cambio')
    .update({ nombre: 'Oficial', valor: 6.96, activo: true, es_default: true })
    .eq('clave', 'oficial')
  exigir(oficial.error, 'el oficial')
  const historial = await cliente
    .from('tipos_cambio_historial')
    .delete()
    .not('valor_anterior', 'is', null)
  exigir(historial.error, 'el historial')
  const apibara = await cliente
    .from('integraciones')
    .update({
      activa: false,
      secreto_guardado_en: null,
      config: {
        plataformas: ['copart', 'iaai'],
        endpoint: 'https://apibara.tech/api/v1/vehicle-auction',
      },
    })
    .eq('clave', 'apibara')
  exigir(apibara.error, 'la integración')
  // Lo que un e2e subió al bucket `marca` ya no lo referencia nadie.
  for (const carpeta of ['logos', 'iconos']) {
    const { data: objetos, error } = await cliente.storage.from('marca').list(carpeta)
    exigir(error, `la carpeta ${carpeta}`)
    const rutas = (objetos ?? []).map((objeto) => `${carpeta}/${objeto.name}`)
    if (rutas.length > 0) {
      exigir((await cliente.storage.from('marca').remove(rutas)).error, `los objetos de ${carpeta}`)
    }
  }
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
