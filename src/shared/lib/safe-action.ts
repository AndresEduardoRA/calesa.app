// Clientes de next-safe-action. Toda mutación entra por acá: valida la entrada con Zod
// (`.inputSchema()`), y lo esperable vuelve como valor (`Resultado<T>` desde el cuerpo de la
// action); sólo lo que nadie previó cae en `handleServerError`.
import { createSafeActionClient, returnServerError } from 'next-safe-action'
import { MENSAJE_INESPERADO, type ErrorApp } from './errores'
import { concesionesDe } from './permisos'
import { createClient } from './supabase/server'

// Sólo para lo que ocurre antes de tener sesión: ingresar, registrarse, recuperar la contraseña.
export const actionClientPublico = createSafeActionClient({
  // Errores de validación planos (`fieldErrors.campo[]`): es lo que un formulario pinta por campo.
  defaultValidationErrorsShape: 'flattened',
  handleServerError(error): ErrorApp {
    // El detalle queda en el log del servidor; a la persona no se le muestra.
    console.error(error)
    return { codigo: 'inesperado', mensaje: MENSAJE_INESPERADO }
  },
})

// El de todas las demás actions. Sin usuario falla antes de ejecutar. Deja en `ctx` el cliente
// del usuario (con su RLS), su id verificado y sus permisos: `puede(ctx.permisos, clave, origenId)`.
export const actionClient = actionClientPublico.use(async ({ next }) => {
  const supabase = await createClient()
  const { data: sesion } = await supabase.auth.getClaims()
  const usuarioId = sesion?.claims.sub
  if (!usuarioId) {
    return returnServerError<ErrorApp>({
      codigo: 'no_autenticado',
      mensaje: 'Tu sesión venció. Volvé a ingresar.',
    })
  }

  // Bloqueado o dado de baja: `mis_permisos()` devuelve vacío y `puede()` responde que no a todo.
  const { data: filas, error } = await supabase.rpc('mis_permisos')
  if (error) {
    throw new Error(`mis_permisos() falló: ${error.message}`)
  }
  return next({ ctx: { supabase, usuarioId, permisos: concesionesDe(filas) } })
})
