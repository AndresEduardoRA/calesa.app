---
name: piloto
description: Un paso de docs/PLAN.md de importadora, de punta a punta en una sesión (plan por el planificador, auditoría en contexto aparte, ejecución, informe y commits sin push). Sólo lo lanza el bucle del piloto (`claude -p "/piloto <paso>"`); no se invoca a mano.
argument-hint: '<paso> [continuar] [--hasta-plan] [--en-seco]'
disable-model-invocation: true
---

# /piloto $ARGUMENTS

Eres la sesión de **un** paso. El bucle (`scripts/piloto/bucle.sh`, bash, sin modelo) te lanzó con `claude -p`; nadie te contesta en vivo. Lo que necesites decidir
que no sea tuyo se lo pides al bucle por `.piloto/ultimo.json` (una **compuerta**), no por una pregunta: aquí no hay `AskUserQuestion`. `$ARGUMENTS`:
el número del paso y, opcionales, `continuar` (retomas esta sesión tras una compuerta o un fallo), `--hasta-plan` (te detienes cuando el plan está auditado) y
`--en-seco` (planificas y auditas, y no ejecutas nada).

## Reglas que no se negocian

- **No publicas.** Nada de `git push`, PR, `gh` que escriba ni `claude`: el hook `bloquear-peligrosos.sh` lo rechaza con `PILOTO=1`, y es el bucle el que verifica y empuja
  (en bash, con su propia copia de las piezas). Tus commits quedan locales.
- **Lo que autoriza no es tuyo:** no escribes ni nombras `<carpeta común de git>/piloto/**` (la compuerta, la decisión, los `aprobado-<paso>`) ni
  `.piloto/decision.md` (`guardar-autorizaciones.sh` lo bloquea). La decisión vigente de la persona la lees de `.piloto/hechos.json` › `decision`.
- La base local y el servidor de e2e son de una sola sesión a la vez: `db:*` y `test:e2e*` toman el candado (`scripts/candado.sh`, `hechos.json` › `candado` dice quién lo tiene). Si está
  ocupado, espera con `CANDADO_ESPERA=<segundos>` o pide una compuerta `afuera`. Nunca lo saltes (`bloquear-peligrosos.sh` lo rechaza).
- Sigues `CLAUDE.md` y las reglas de `.claude/rules/`. Un número de dinero va por `<Monto>`; los nombres salen de la base; ninguna tabla sin RLS. «Nadie prueba a mano».
- Nunca `--no-verify`, nunca desactivar una regla de lint, nunca la clave real de apibara ni una credencial. No instalas ni cambias dependencias (compuerta `dependencia`).
- Una sola fase de `docs/PLAN.md`: tu paso. Nada de paso de más.

## El camino

1. **Orientarte** (poco): `.piloto/hechos.json`, `docs/ESTADO.md`, y con `continuar`, `.piloto/planes/<paso>.md` y `.piloto/informes/<paso>.md` si existen.
2. **Planificar.** Invoca al subagente `planificador` (opus): orienta, parte si hace falta y escribe `.piloto/planes/<paso>.md` con
   [plantilla-plan.md](plantilla-plan.md). No escribes tú el plan: el planificador es el único que lo hace, y su Bash es de sólo lectura.
3. **Auditar el plan.** Invoca al subagente `auditor` (opus, en un contexto aparte) sobre ese plan. Su primera línea es `VEREDICTO: pasa|observaciones|bloquea`.
   `observaciones`: las atiendes en el plan y sigues. `bloquea`: un `planificador` nuevo con sus objeciones, otra auditoría; **a la segunda que bloquee, compuerta `atasco`**.
   Antes de esa 2.ª ronda copia el plan auditado a `.piloto/planes/<paso>.auditado.md` y dile al auditor que es la segunda: audita sólo lo cambiado y
   `<paso>.respuestas.md` (en el 4.13-3b la 2.ª ronda volvió a verificar todo: 2,63 USD). El planificador contesta las objeciones en ese archivo y corrige el plan con
   `Edit`, sin reescribirlo; el plan pesa ≤ 60 KB (`wc -c`).
4. **Compuertas del plan** ([compuertas.md](compuertas.md)): si el plan toca datos o seguridad (policy, RLS, permiso, `security definer`, Vault), pide una dependencia
   nueva o deja una pregunta de producto o de UX abierta → termina con `resultado: compuerta` (ver «Terminar»). Con `--hasta-plan`, tras auditar el plan terminas
   **siempre** con una compuerta `datos` que lleve el plan en su `contexto`: la persona lo ve antes de que se ejecute. Si el plan es de **Nivel 2** (o corre el completo)
   y `hechos.json` › `funciones` no las tiene todas en `true`, compuerta `afuera` antes de ejecutar («faltan las funciones edge (…): `npx supabase functions serve`»): el
   completo las exige y el bucle no las levanta. El bucle ya lo mira por el nivel del ruteo; esto cubre el plan que sube de nivel.
5. **Ejecutar y verificar** (Nivel 1, 2 o 3 de `.claude/rules/e2e.md`, el que dice el plan): primero las pruebas que fallan, **guardadas en rojo contra HEAD**; después el
   código; después las mutaciones del plan (cada una tiene que hacer caer su prueba). Cada salida va a `.piloto/salidas/<paso>/` con `tee`; las corridas largas con
   `nohup … ; echo $? > <algo>.fin` y una espera de primer plano. **Antes de una corrida pesada** (`pnpm test`, `typecheck`, `lint`, mediciones) espera, en un bucle de primer plano
   de ≤ 9 minutos, a que no haya procesos de otra sesión (`playwright`, `next build`, `vitest`, `carreras`, `medir`, `supabase db|start` fuera de este árbol) y a que `loadavg` < 1,5.
6. **Informe** en `.piloto/informes/<paso>.md` ([plantilla-informe.md](plantilla-informe.md)): qué se hizo, la salida real de cada prueba (con su ruta), lo que no se hizo.
7. **Auditar el informe.** Mismo `auditor`, mismo tope: dos bloqueos y es una compuerta `atasco`.
8. **Docs y commits.** Los docs que dice el plan (ESTADO por sustitución, ≤ 60 líneas medido con `wc -l`; BITACORA con el marcador `e2e completo: sí|no (…)`; DECISIONES con
   la fecha de `TZ=America/La_Paz date +%F`; fichas; `bash scripts/mapa.sh`). **Commits por intención**, asunto en español, minúscula, ≤ 72 caracteres, mensaje con `-F`, `mapa.sh`
   antes: **hasta 3 de código y el de docs** (si el plan necesitaba más, el paso no cabía y se partía); el `fix` que pida la auditoría del informe va aparte y no cuenta.
   **Sin push.** Verifica con `git log` que existen.
9. **Terminar.** Escribe `.piloto/ultimo.json` (abajo) y responde con una línea. El bucle lo valida con `jq`; un `ultimo.json` que falte o no valide es un fallo del proceso.

## `.piloto/ultimo.json`

```json
{
  "paso": "<el mismo paso>",
  "resultado": "listo | compuerta | falla",
  "resumen": "qué se hizo o qué pasó, en pocas frases",
  "commits": ["<sha>", "…"],
  "e2e_dirigidos": ["e2e/<spec>.spec.ts"],
  "compuerta": null
}
```

- **`listo`:** los commits son **todos** los del paso (`HEAD de arranque..HEAD`, ni uno más) y el árbol está limpio. `e2e_dirigidos`: los specs que tocan lo que cambiaste (grepea `e2e/` por el texto tocado); el bucle los repite.
- **`compuerta`:** `compuerta` es `{ "tipo", "motivo", "pregunta", "opciones": [{ "etiqueta", "descripcion" }, …], "contexto": ["<ruta>", …] }`; de **2 a 4 opciones, la recomendada primero**; `contexto` lleva las
  rutas que la persona puede abrir (el plan, el informe). Te retoman con `continuar`: la respuesta literal está en `hechos.json` › `decision`.
  La de **`producto`** lleva, en vez de `pregunta` y `opciones`, **una pregunta por decisión** abierta del plan, en su orden, en `preguntas`: cada una
  `{ "id": "P0", "pregunta", "opciones" }` (de 1 a 12 preguntas; `id` de ≤ 12 caracteres y sin repetir; de 2 a 4 opciones cada una, la recomendada primero). La persona las
  contesta en tandas de 4 y la respuesta trae una línea `- P0: …` por decisión.
- **`falla`:** lo que no pudiste y por qué (una prueba que no se pone verde, el entorno). No inventes un `listo`.

Con `--en-seco`: planificador y auditor y nada más (el bucle te lo limita por permisos, no por obediencia): imprime el plan, el veredicto y, como sonda, haz que el auditor corra
`touch .piloto/sonda` —su hook de sólo lectura tiene que rechazarlo— y di qué pasó.
