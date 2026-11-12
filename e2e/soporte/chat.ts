// El terreno de los e2e del chat: la dueña, dos personas que pueden conversar (Ana, de ventas, y Luis, de logística) y una que
// no (Sofía), más conversaciones sembradas por SQL. Sembrar por SQL no es un atajo: la lista y su señal de Realtime es lo que
// prueba `chat.spec.ts`; abrir una directa y escribir va por la interfaz (`abrirDirectaYEscribir`).
import { randomUUID } from 'node:crypto'
import type { Page } from '@playwright/test'
import {
  DOMINIO_E2E,
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
  type PermisoDePrueba,
} from './base'
import { CONTRASENA } from './alta'
import { sql } from './sql'

export type PersonaDelChat = { email: string; nombre: string; id: string }

export type TerrenoDelChat = {
  ana: PersonaDelChat
  luis: PersonaDelChat
  // Puede conversar y no tiene ninguna conversación sembrada: con ella se abre una directa nueva.
  marta: PersonaDelChat
  sofia: PersonaDelChat
  duena: PersonaDelChat
  // La directa de Ana con Luis (la más vieja) y la de Ana con la dueña (la más nueva).
  conLuis: string
  conLaDuena: string
}

const delDominio = `select id from auth.users where email like '%@${DOMINIO_E2E}'`

// Las conversaciones y los mensajes de las personas de prueba: `conversaciones.creado_por` y `mensajes.autor_id` no
// tienen `on delete cascade`, así que se borran antes que las personas (los miembros y los mensajes caen con su conversación); igual las tareas y
// los eventos que se crean desde el chat (7.10-3).
export function borrarChatDePrueba(): void {
  sql(`delete from public.mensajes where autor_id in (${delDominio});
       delete from public.conversaciones where creado_por in (${delDominio});
       delete from public.tareas where creado_por in (${delDominio}) or responsable_id in (${delDominio});
       delete from public.eventos where creado_por in (${delDominio})`)
}

async function crearConRol(
  proyecto: string,
  etiqueta: string,
  nombre: string,
  permisos: PermisoDePrueba[],
): Promise<PersonaDelChat> {
  const email = correoDePrueba(`${etiqueta}-chat-${proyecto}`)
  await crearPersona({ email, contrasena: CONTRASENA, nombre, invitada: true })
  await darRolDePrueba({
    email,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Chat ${etiqueta} ${proyecto}`,
      clave: `e2e_chat_${etiqueta}_${proyecto.replaceAll(/[^a-z0-9]/g, '_')}`,
    },
    permisos,
  })
  return { email, nombre, id: sql(`select id from auth.users where email = '${email}'`) }
}

// Una directa entre dos personas, con la hora de su último mensaje (`ultimo_mensaje_en` lo mueve el trigger con cada mensaje).
export function sembrarDirecta(a: string, b: string, creadaPor: string): string {
  const id = randomUUID()
  sql(`insert into public.conversaciones (id, tipo, creado_por, par_directo)
       values ('${id}', 'directa', '${creadaPor}', array[least('${a}'::uuid, '${b}'::uuid), greatest('${a}'::uuid, '${b}'::uuid)]);
       insert into public.conversaciones_miembros (conversacion_id, usuario_id)
       values ('${id}', '${a}'), ('${id}', '${b}')`)
  return id
}

// Un mensaje de texto de `autor`, `haceMinutos` atrás (o ahora).
export function sembrarMensaje(
  conversacion: string,
  autor: string,
  cuerpo: string,
  haceMinutos = 0,
): void {
  sql(`insert into public.mensajes (conversacion_id, autor_id, cuerpo, creado_en)
       values ('${conversacion}', '${autor}', '${cuerpo.replaceAll("'", "''")}', now() - interval '${String(haceMinutos)} minutes')`)
}

// `permisosDeAna` y `permisosDeLuis`: los de Ana (ventas) y Luis (logística); por omisión sólo `chat.participar`. Un e2e que hace mencionar un lead suma `leads.ver`
// a Ana y uno que crea una tarea, `agenda.tareas.asignar` a Ana y `agenda.tareas.recibir` a Luis.
export async function prepararChat(
  proyecto: string,
  opciones: { permisosDeAna?: PermisoDePrueba[]; permisosDeLuis?: PermisoDePrueba[] } = {},
): Promise<TerrenoDelChat> {
  borrarChatDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  const emailDeLaDuena = correoDePrueba(`duena-chat-${proyecto}`)
  await crearDuenaDePrueba({ email: emailDeLaDuena, contrasena: CONTRASENA, nombre: 'Dalia Chat' })
  const duena = {
    email: emailDeLaDuena,
    nombre: 'Dalia Chat',
    id: sql(`select id from auth.users where email = '${emailDeLaDuena}'`),
  }
  const [ana, luis, marta, sofia] = await Promise.all([
    crearConRol(proyecto, 'ana', 'Ana Chat', opciones.permisosDeAna ?? ['chat.participar']),
    crearConRol(proyecto, 'luis', 'Luis Chat', opciones.permisosDeLuis ?? ['chat.participar']),
    crearConRol(proyecto, 'marta', 'Marta Chat', ['chat.participar']),
    // Sin `chat.participar`: tiene otro permiso cualquiera para que el rol exista.
    crearConRol(proyecto, 'sofia', 'Sofía Chat', ['agenda.tareas.recibir']),
  ])
  // Luis escribió primero (hace 2 horas) y la dueña después (hace 1): en la lista, la dueña va arriba.
  const conLuis = sembrarDirecta(ana.id, luis.id, luis.id)
  sembrarMensaje(conLuis, luis.id, 'Hola Ana, ¿viste el contenedor?', 120)
  const conLaDuena = sembrarDirecta(ana.id, duena.id, duena.id)
  sembrarMensaje(conLaDuena, duena.id, 'Ana, revisa la cotización', 60)
  return { ana, luis, marta, sofia, duena, conLuis, conLaDuena }
}

export async function limpiarChat(): Promise<void> {
  borrarChatDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
}

// Escribe en el hilo abierto con Enter (Enter envía; Mayús+Enter salta de línea).
export async function escribirEnElHilo(page: Page, texto: string): Promise<void> {
  const redactor = page.getByRole('textbox', { name: 'Mensaje' })
  await redactor.fill(texto)
  await redactor.press('Enter')
}

// El mismo camino de la persona: «Nueva conversación» › «Mensaje directo» › buscar › elegir (si ya hay una directa, abre esa) y escribir.
export async function abrirDirectaYEscribir(
  page: Page,
  nombre: string,
  texto: string,
): Promise<void> {
  await page.goto('/chat')
  await page.getByRole('button', { name: 'Nueva conversación' }).click()
  await page.getByRole('menuitem', { name: 'Mensaje directo' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Nueva conversación' })
  await dialogo.getByRole('searchbox').fill(nombre)
  await dialogo.getByRole('button', { name: nombre }).click()
  await page.waitForURL(/\/chat\?c=[0-9a-f-]{36}$/)
  await escribirEnElHilo(page, texto)
}
