## Paso 9.13-3 · Despliegue en seco: la guía y la lista de la persona (2026-11-13)

- **`docs/DESPLIEGUE.md`** (nuevo): la lista de la persona en el orden en que se ejecuta, con la orden de cada paso y qué mirar en su salida.
  El ensayo en seco, `env:check produccion` (primera pasada), el respaldo, las migraciones (el `--dry-run` y recién después aplicarlas),
  Vault (`url_proyecto`), VAPID, las funciones edge, Auth, el correo y el dominio, Integraciones dentro de la app y la pasada final. Siguen
  «Volver atrás», «La instalación de un cliente» (con sus tres pasos de más), «Lo que sólo una persona comprueba» (9-12, las fotos en
  iPhone, los dos dispatch de 9-6 y el de 9-11, 5a-4b) y «Lo que el panel de advisors muestra y está bien». Recoge las cinco líneas «Para
  la persona» del guion. Cita `docs/ENTORNOS.md` por secciones y no lo copia.
- **La auditoría del plan bloqueó una vez** y sus objeciones se corrigieron en el plan (`.piloto/planes/9.13-3.respuestas.md`). La de fondo
  era el proyecto enlazado: `resetear.sh` toma el ref de `supabase/.temp/project-ref`, igual que toda orden con `--linked`. Si enlazabas un
  cliente y después «restaurabas la demo» desde el mismo checkout, borrabas al cliente. Por eso la guía abre con dos advertencias en negrita
  y manda instalar un cliente desde un clon aparte. Además, `env:check produccion` sin `SUPABASE_PROJECT_REF` revisa la demo y en un cliente
  da un verde falso: ahora es una entrada obligatoria.
- **`scripts/despliegue/guia.test.ts`** (4 pruebas) arma el mismo inventario que el guion. Cae si la guía no nombra, entre comillas de
  código, cada función edge, cada secreto propio de una función y cada nombre de Vault que crea la persona o la app. También cae si falta
  algo de una lista fija: el ensayo, `--dry-run`, `env:check produccion`, `SUPABASE_PROJECT_REF`, `demo.yml`, `DEMO_PROJECT_REF`,
  `web_revalidar_correr`, Integraciones y los cuatro abiertos. Comprobado: sin las comillas de `importar-csv`, cae la de funciones.
- **`docs/ENTORNOS.md`** enlaza la guía. La fila de `url_proyecto` dice quién la crea en un proyecto nuevo, y `DEMO_PROJECT_REF` entra en la
  tabla junto a los secretos de GitHub. «El job de CI de la etapa 6» pasa a llamarse `demo.yml`, que también despliega las funciones. Suma
  una línea: el ensayo corre `env:check produccion` sin entorno. **`docs/GLOSARIO.md`**: la entrada «Despliegue en seco» apunta a la guía,
  sin término nuevo.

### Para el coordinador

1. **PLAN:** la fila **9.13** queda hecha (`docs/pasos/9.13-1/`, `9.13-2/`, `9.13-3/`). En **9-6**, **9-11**, **9-12** y **5a-4b** se suma
   «en la lista de la persona: `docs/DESPLIEGUE.md` › «Lo que sólo una persona comprueba»». Siguen abiertos: sólo la persona los cierra.
2. **ESTADO:** «Despliegue: el ensayo en seco en `listo` y la lista de la persona en `docs/DESPLIEGUE.md` (lo cierra el 9.14 como “listo
   para desplegar”)». En «Deuda aceptada», la línea que dejó la 9.13-1 (`docs/pasos/9.13-1/decisiones.md`), y «falta probar fotos en
   iPhone» pasa a «fotos en iPhone: en la lista de la persona».
3. **«Terminado cuando» de la Fase 9:** queda cerrado «splinter y los advisors en cero errores», salvo los 6 ERROR esperados de las vistas
   `web.*` (D15). «Desplegada apuntando al proyecto Pro» es un paso de la persona, con todo verificado.

### Arreglo del CI del PR (2026-11-13)

El job «Base» cayó en «la base contra el repo»: `db:lint contra su lista` no encontraba la línea `{"results":…}`. La CLI de Supabase
(2.120.0, la misma en local y en CI) cambia de formato según quién la corre: con un agente (`AI_AGENT`, `CLAUDECODE`) imprime esa línea;
sin él, el arreglo con sangría. Se reprodujo en local quitando esas variables. `leerDbLint()` (`scripts/despliegue/avisos.ts`) lee las dos
formas y `en-seco.test.ts` lo prueba; el revisor da `✓ db:lint contra su lista (37 funciones con avisos)` con las dos salidas reales
(`.piloto/salidas/9.13/revisar-db-lint.txt`).

- e2e completo: no (9.13-3, Nivel 1: sólo docs y una prueba de la guía; lo prueba el CI del PR; dirigidos: ninguno)
