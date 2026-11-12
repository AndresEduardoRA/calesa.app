## 2026-11-12 · Paso 8.05-2: la disponibilidad y la ficha en `/perfil` (parte 2 de 2)

### Hecho

- `entities/turnos/ficha.ts`: `esWhatsapp` (espejo del check `perfiles_whatsapp_web_check`), `esHandle` (3 a 30 de `a-z0-9._-`), `especialidadesDeTexto` y el tipo
  `MiFichaEnLaWeb`; `motivoSinInterruptor` en `rueda.ts`. Con sus tests (11 pruebas nuevas, más 4 del esquema de la ficha).
- `infra/turnos/mi-ficha.ts` (`leerMiFichaEnLaWeb`: la fila propia de `cola_web_asesores` y de `perfiles`, por clave primaria) por `areas/turnos/composicion.ts`.
- El interruptor «Disponible para recibir turnos» en «Turnos de la web»: la action `cambiarDisponibilidad` escribe sólo `cola_web_asesores.disponible` de la propia fila;
  apagado y deshabilitado con su motivo si el rol no recibe turnos, no la sumaron a la rueda o se mira otro rol.
- «Tu ficha en la web» (WhatsApp, identificador, cargo, presentación, especialidades y «Aparecer en la web»): `guardarFicha` escribe directo bajo la RLS con
  `actualizado_en` de versión; conflicto con `<AvisoDeConflicto>`, identificador repetido junto a su campo. El formulario se monta y se pide con `diferido()` al abrir
  el bloque.
- `/perfil`: `<TurnosDelPerfil>` tras su `<Suspense>`; `<FormularioPerfil>` con `key` = la versión del perfil (guardar la ficha cambia `actualizado_en`).
- `e2e/perfil-disponibilidad.spec.ts` (escritorio y celular): apagar corta el reparto (cae al respaldo) y encender lo devuelve; rol sin turnos: apagado, deshabilitado y
  con motivo; la ficha guarda en la base.
- Presupuesto: el documento de `/perfil` sube a 109.522 B; tope 103 → 113 KB (`docs/RENDIMIENTO.md`).
- Con esto el paso 8.05 queda completo (2 de 2); sigue abierto D4 de la 8.05-1 (vincular una solicitud ya contactada pide una RPC).

Commits: el de la lectura, el del interruptor, el de la ficha, el e2e, el `fix` de la frase repetida, el `perf` del formulario diferido y el de docs.

### Verificación

- Vitest: `ficha.test.ts`, `rueda.test.ts`, `schemas/ficha.test.ts` en verde; guardas completas (`scripts/guardas`): 1126 pruebas.
- Sin base nueva: sin migración, policy ni tipos.
- e2e `perfil-disponibilidad`: 6 de 6 (`.piloto/salidas/8.05-2/perfil-disponibilidad.txt`). Dirigidos `rueda-por-rol`, `web-turno`, `perfil-avatar`, `perfil-notificaciones`
  y `presupuesto-js`: 0 caídas (`.piloto/salidas/8.05-2/dirigidos.txt`, `presupuesto.txt`).
- e2e completo: no (8.05-2, Nivel 1, dirigidos: perfil-disponibilidad, rueda-por-rol, web-turno, perfil-avatar, perfil-notificaciones, presupuesto-js)
