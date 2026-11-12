'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { conflicto, errorDePostgrest } from '@/shared/lib/errores'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { MENSAJE_HANDLE, MENSAJE_WHATSAPP } from '../../../../entities/turnos/ficha'
import { esquemaFicha } from '../schemas/ficha'

const HANDLE_EN_USO = 'Ese identificador ya está en uso.'
const FICHA_CAMBIO = 'Tu ficha cambió desde que abriste esta pantalla.'

// «Tu ficha en la web» (8.05-2): escribe directo, bajo la RLS, sólo seis columnas de la fila propia de `perfiles` (el id sale de la sesión, no del formulario) con la versión
// esperada: otra pestaña o quien administra el equipo la cambió = ninguna fila coincide y no se pisa nada. Nadie necesita un permiso para editar lo suyo; la base repite
// la policy y el grant por columna. El identificador es único (23505 → su campo) y el WhatsApp tiene su check (23514 → su campo).
export const guardarFicha = actionClient
  .inputSchema(esquemaFicha)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<null>> => {
    const { data, error } = await ctx.supabase
      .from('perfiles')
      .update({
        handle: parsedInput.handle === '' ? null : parsedInput.handle,
        cargo_web: parsedInput.cargo === '' ? null : parsedInput.cargo,
        whatsapp_web: parsedInput.whatsapp === '' ? null : parsedInput.whatsapp,
        bio_web: parsedInput.presentacion === '' ? null : parsedInput.presentacion,
        especialidades: parsedInput.especialidades,
        publico_web: parsedInput.publicoWeb,
      })
      .eq('id', ctx.usuarioId)
      .eq('actualizado_en', parsedInput.actualizadoEnEsperado)
      .select('actualizado_en')
    if (error) {
      if (error.code === '23505') {
        return {
          ok: false,
          error: { codigo: 'duplicado', mensaje: HANDLE_EN_USO },
          porCampo: { handle: HANDLE_EN_USO },
        }
      }
      if (error.code === '23514' && /whatsapp/i.test(error.message)) {
        return {
          ok: false,
          error: { codigo: 'validacion', mensaje: MENSAJE_WHATSAPP },
          porCampo: { whatsapp: MENSAJE_WHATSAPP },
        }
      }
      if (error.code === '23514' && /handle/i.test(error.message)) {
        return {
          ok: false,
          error: { codigo: 'validacion', mensaje: MENSAJE_HANDLE },
          porCampo: { handle: MENSAJE_HANDLE },
        }
      }
      return { ok: false, error: errorDePostgrest(error) }
    }
    if (data.length === 0) {
      return conflicto(FICHA_CAMBIO)
    }
    // El nombre y la foto del menú comparten la versión del perfil: se vuelve a pedir lo que la usa.
    revalidatePath(RUTAS.perfil)
    return { ok: true, data: null }
  })
