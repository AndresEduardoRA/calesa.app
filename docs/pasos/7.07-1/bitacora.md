## 2026-11-11 — Paso 7.07-1: el calendario de lectura de `/agenda` (parte 1 de 3 del 7.07)

- **Hecho:** `/agenda` existe y la navegación la prende. Sólo lectura: calendario de mes, semana y día con la barra (`?vista=`, `?fecha=`, `?ver=`, `?de=`),
  chips con la clase en texto, estados (esqueleto, vacío, tope, error por `error.tsx`) y «Ver la de todos» sólo con `agenda.ver_todo`. `parcial: true`.
  - `entities/agenda.ts` (clases, esquema Zod de `agenda_rango`, `entradasDeAgenda`) y `entities/calendario.ts` (semanas, rangos con cortes de día en la zona,
    agrupación, títulos), con sus tests: 45 en `src/modules/agenda`.
  - `leerAgenda` por `index.ts` (una llamada a `agenda_rango`), `<ChipEvento>` por `client.ts`, `pantallas/agenda.ts`.
  - `e2e/agenda.spec.ts`: la asesora invitada ve el evento «seleccionados» y su tarea en el día; un tercero no ve el evento; `?de=todos` sin permiso no rompe;
    la dueña ve la tarea de la asesora con «Ver la de todos» y lo elegido queda en la URL.
- **Queda para 7.07-2 y 7.07-3** (plan en `.piloto/planes/7.07-1.md` › «Partición»): paneles de evento y tarea con crear, editar y eliminar; completar, reasignar,
  «Sin fecha», recordatorios, bloque «Mis tareas» de la bandeja y el registro de `agenda_tareas_sin_fecha` en `scripts/guardas/areas-b/paginas-en-la-base.ts`.
- **Verificación** (`.piloto/salidas/7.07-1/`): `vitest` de agenda, `src/app/(app)` y `scripts/guardas` 1.184 ✓; `lint` y `typecheck` sin avisos; `mapa.sh --check`
  limpio; e2e `agenda` 4 ✓ (escritorio y móvil) y `acceso`, `barra-superior-celular`, `inicio-bandeja` 26 ✓, 5 saltadas (ya lo estaban).
  Mutación de control: con «+24 h» en vez del día siguiente cae la prueba del día de 25 h en Madrid.
- e2e completo: no (7.07-1, Nivel 2 por _shell; lo corre el CI del PR; cuenta 0 de 3)
