// La clave de apibara en Vault, para los e2e que llaman a la edge function de verdad. La función responde `apagada` ANTES de mirar la
// dirección de una foto si `integracion_secreto('apibara')` no devuelve nada (`supabase/functions/apibara/index.ts`), y `fijarApibara()`
// sólo sella `secreto_guardado_en`: una base recién reseteada (los bloques de CI) no tiene clave. Un spec que la necesite deja la suya
// y la quita al terminar; nunca pisa una que ya exista (puede ser la real de quien usa la app local) ni la lee.
import { createClient } from '@supabase/supabase-js'
import { admin, entorno } from './base'
import { CLAVE } from './inventario'
import { literal, sql } from './sql'

// Claramente falsa: la función nunca llega a la API con ella (los caminos que prueban los specs cortan antes).
export const CLAVE_DE_RELLENO = 'e2e-sin-clave-real'

const NOMBRE_DEL_SECRETO = 'integracion:apibara'

// El id del secreto de apibara, o `null` si no hay. Se pregunta si existe: la clave nunca se descifra ni se imprime.
export function idDelSecretoDeApibara(): string | null {
  const id = sql(`select id from vault.secrets where name = ${literal(NOMBRE_DEL_SECRETO)}`)
  return id === '' ? null : id
}

// Huella de lo guardado sin descifrarlo: el id, cuándo se tocó y el hash del texto cifrado. Si cambia, alguien lo escribió.
export function huellaDelSecretoDeApibara(): string {
  return sql(
    `select id || '|' || updated_at::text || '|' || md5(secret::text) from vault.secrets where name = ${literal(NOMBRE_DEL_SECRETO)}`,
  )
}

// Deja `CLAVE_DE_RELLENO` si no hay ninguna clave y devuelve cómo quitarla. Si ya hay una, no la toca y lo que devuelve no hace nada.
// Se guarda por la vía de la app, `integracion_guardar_secreto()` con la sesión de `persona` (que necesita `empresa.ajustes.gestionar`:
// la función pide el permiso y con la clave de servicio no hay quien lo tenga). Quitarla borra ese secreto por su id y devuelve la
// integración a quien la actualizó antes (la función lo sella con la persona).
export async function asegurarClaveDeRelleno(persona: string): Promise<() => Promise<void>> {
  if (idDelSecretoDeApibara() !== null) {
    return async () => {}
  }
  const antes = await admin()
    .from('integraciones')
    .select('actualizado_en, actualizado_por')
    .eq('clave', 'apibara')
    .single<{ actualizado_en: string; actualizado_por: string | null }>()
  if (antes.error) {
    throw new Error(`No se pudo leer la integración: ${antes.error.message}`)
  }
  const cliente = createClient(
    entorno('NEXT_PUBLIC_SUPABASE_URL'),
    entorno('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const sesion = await cliente.auth.signInWithPassword({ email: persona, password: CLAVE })
  if (sesion.error) {
    throw new Error(`No se pudo ingresar como ${persona}: ${sesion.error.message}`)
  }
  const { error } = await cliente.rpc('integracion_guardar_secreto', {
    p_clave: 'apibara',
    p_secreto: CLAVE_DE_RELLENO,
    p_actualizado_en_esperado: antes.data.actualizado_en,
  })
  if (error) {
    throw new Error(`No se pudo dejar la clave de relleno: ${error.message}`)
  }
  const id = idDelSecretoDeApibara()
  if (id === null) {
    throw new Error('La clave de relleno no quedó en Vault.')
  }
  return async () => {
    sql(
      `delete from vault.secrets where id = ${literal(id)} and name = ${literal(NOMBRE_DEL_SECRETO)}`,
    )
    const { error: alRestaurar } = await admin()
      .from('integraciones')
      .update({ actualizado_por: antes.data.actualizado_por })
      .eq('clave', 'apibara')
    if (alRestaurar) {
      throw new Error(`No se pudo devolver la integración: ${alRestaurar.message}`)
    }
  }
}
