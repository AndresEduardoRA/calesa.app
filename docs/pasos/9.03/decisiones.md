## 2026-11-11 — Paso 9.03-1: dominancia sobre la persona, la base (9-1)

- **Desbloquear también exige dominar** (recomendada del PLAN): es la misma RPC con `p_bloquear = false`, y desbloquear a quien tiene más permisos que tú es devolverle el acceso.
- **Quitar un rol que dominas a alguien que no dominas, tampoco** (recomendada del PLAN): la regla del 2026-10-21 es sobre la persona, no sobre el rol.
- **`dominada` no entra en `equipo_lista()`; se lee con `personas_dominadas(p_ids uuid[])`** (≤ 101 ids, exige `equipo.usuarios.ver` o `.gestionar`). `equipo_lista()` devuelve `setof uuid` desde tres rutas de SQL dinámico: cambiarle el retorno obligaba a `drop function`, a reescribir `equipo-lista.sql` y `medir-equipo.sql` y a tocar el registro de páginas. La lectura aparte deja intacto el plan medido de la lista y sirve igual a la página de una persona.
- **Orden de las comprobaciones:** permiso → cuenta propia → perfil `for update` (PT409 si no está) → dominancia (42501) → estado (PT409). Quien no domina a la persona no se entera de su estado.
- **Candados:** además del perfil, los roles de la persona `for share` (un `rbac_otorgar()` sobre un rol que ya tiene no se cuela) y, al asignar y quitar, `p_rol` `for share` antes de `rol_dominado` (auditoría del plan). La comprobación va en una función `volatile` y en una sentencia aparte del candado: en READ COMMITTED así ve lo que el otro acaba de confirmar.
- **«El dueño domina a todos» = quien llama tiene el rol de clave `dueno`** (activo y sin bloqueo), aunque a ese rol le falte algún permiso (`nivel_crear(…, p_conceder = false)` o un permiso nuevo de una migración futura).
- **Asignar o quitar un rol a una persona sin perfil es PT409** «Esa persona ya no está en el equipo.» (antes, 23503 de la FK al asignar y nada al quitar).
- **El mensaje:** `No puedes <bloquear a | desbloquear a | dar de baja a | cambiar los roles de> <nombre>: tiene permisos que tú no tienes.` (42501).
- **`humo.sql`:** los dos tramos donde Gabriela bloqueaba o daba de baja a la dueña los hace ahora Pablo (rol `dueno`, invitación sin aceptar): Gabriela ya no domina a la dueña y caería por eso antes que por el guardián; el guardián sigue sin contar a Pablo.
- **Un commit para la regla y su lectura** (el plan decía dos): `personas_dominadas()` es la cara pública de `_personas_dominadas()`, va en la misma migración y así la base se resetea una vez por commit.

## 2026-11-11 — Paso 9.03-2: dominancia sobre la persona, la interfaz (9-1)

- **Deshabilitado con motivo, nunca escondido:** «Cambiar sus roles», «Bloquear»/«Desbloquear» y «Dar de baja» se siguen dibujando, apagados, con una nota al final del «⋯» (el patrón de la cuenta propia).
- **El motivo nombra lo que ofrece el menú:** «Tiene permisos que tú no tienes: no puedes cambiar sus roles, bloquearla ni darla de baja.» (o «desbloquearla»).
- **Si `personas_dominadas()` falla, apaga:** la lista se ve igual, `dominada` es `null` y la nota dice «No pudimos comprobar si tienes todos sus permisos. Recarga la página para intentarlo de nuevo.». Un error nunca habilita una acción.
- **La cuenta propia gana:** sobre sí misma no se mira `dominada` (quien llama se domina a sí mismo en la base).
- **`motivoSobrePersona()` no mira el estado** (auditoría del plan): el panel de roles se abre también a mano por `?persona=`, aun sobre una dada de baja, y ahí apaga igual.
- **Con `equipo.usuarios.ver` sin `.gestionar`** la lectura se pide igual, sin ramificar: el «⋯» y el panel no se dibujan para esa persona.
- **Panel de roles:** el motivo de la persona va una vez arriba de la lista y en el nombre accesible de cada interruptor; el motivo por rol se queda como estaba.
- **Fuera de alcance:** «Generar otro enlace de invitación» no se apaga (su action ya exige dominar los roles), y el `?baja=` escrito a mano abre el diálogo y la base rechaza con su mensaje.
