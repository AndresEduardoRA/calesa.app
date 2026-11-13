# Despliegue

La lista de la persona para desplegar: en orden, con la orden de cada paso y **qué mirar** en su salida. Ninguna sesión de IA corre
nada de esta guía: una sesión prepara y verifica en seco (`pnpm despliegue:en-seco`), y lo que toca la nube lo hace la persona. Sirve
para la demo y para un cliente; lo que cambia en un cliente está en «La instalación de un cliente».

Qué se configura y dónde vive cada variable está en `docs/ENTORNOS.md` (una sola fuente); esta guía agrega el orden y qué mirar.

> **`scripts/demo/restaurar.sh` y `scripts/demo/resetear.sh` borran la base.** Son sólo de la demo: nunca en un proyecto con datos.

> **El proyecto enlazado manda.** Toda orden con `--linked`, los scripts de `scripts/demo/` y `env:check produccion` sin
> `SUPABASE_PROJECT_REF` actúan sobre el ref guardado en `supabase/.temp/project-ref`, no sobre el que crees. Un cliente se instala
> **desde un clon aparte** del repo. Antes de cada orden, mira ese ref (`cat supabase/.temp/project-ref`) y, en los scripts de la demo,
> la línea `demo: <ref>` que imprimen al empezar: si no es el que esperas, corta (Ctrl+C) antes de que sigan.

Las secciones van en el orden en que se ejecutan.

## Lo que ya está verificado

- `pnpm despliegue:en-seco` termina en `listo` en la sesión: la base desde cero, `db:probar`, `db:lint`, los advisors contra la base
  real con los schemas de `[api]`, el inventario del repo contra la base, `env:check produccion` sin credenciales y `next build`.
- El CI del PR corre el mismo revisor de la base. **Cero ERROR** de splinter salvo los 6 esperados de las vistas `web.*` (abajo, «Lo
  que el panel de advisors muestra y está bien»), y todo WARN con su motivo en `supabase/tests/advisors-con-motivo.json`.

## 1. El ensayo en seco

En tu máquina, desde el commit que vas a desplegar:

```bash
pnpm despliegue:en-seco
```

**Qué mirar:** la última línea es `listo`. Si dice `falta:`, no sigas: lo que falta es un defecto del repo y lo arregla una sesión.
Antes de `listo` viene el bloque «Para la persona»; cada línea tiene su paso más abajo:

- crear el secreto de Vault `url_proyecto` → «5. Vault»;
- los secretos de Vault `integracion:*` los crea la app → «10. Integraciones»;
- la función `push` pide `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` → «6. VAPID»;
- `web_revalidar_correr()` llama a una URL que se configura en Integraciones → «10. Integraciones»;
- correr `env:check produccion` con credenciales → «2. Lo que falta en Vercel y Supabase» y «11. La pasada final».

## 2. Lo que falta en Vercel y Supabase (primera pasada)

Con las credenciales sólo en el entorno de la terminal (nunca en un archivo):

```bash
export VERCEL_TOKEN=… VERCEL_PROJECT_ID=… VERCEL_TEAM_ID=… SUPABASE_ACCESS_TOKEN=… SUPABASE_PROJECT_REF=<ref del proyecto>
pnpm env:check produccion
```

**Qué mirar:** el código de salida (`0` todo completo, `1` falta algo y todo se leyó, `2` un lugar no se pudo leer) y la lista de
faltas por lugar: Vercel Production, Vercel Preview, los secretos de las funciones y la Auth de Supabase. **Sin `SUPABASE_PROJECT_REF`
toma `[remotes.demo]`:** en un cliente revisaría la demo y podría darte un verde falso. Lo que falte se completa en los pasos que siguen,
con la tabla de `docs/ENTORNOS.md › «Variables y ajustes»`. Si dice «respuesta con otra forma», la API cambió y el lector se ajusta en un
paso (`docs/ENTORNOS.md › «env:check produccion»`).

## 3. Respaldo

Antes de aplicar nada en un proyecto que ya tiene datos (en la demo sin datos reales se puede saltar). Con el proyecto enlazado y su ref
mirado:

```bash
DIR="respaldos/$(TZ=America/La_Paz date +%F_%H%M%S)"; mkdir -p "$DIR" && chmod 700 respaldos "$DIR"
pnpm exec supabase db dump --linked -f "$DIR/esquema.sql"
pnpm exec supabase db dump --linked --data-only --use-copy -f "$DIR/datos.sql"
chmod 600 "$DIR"/*
```

**Qué mirar:** dos archivos no vacíos. `respaldos/` está ignorado por git. El respaldo no guarda los archivos de Storage (las fotos y
los documentos de los buckets).

## 4. Migraciones: revisar y después aplicar

```bash
pnpm exec supabase link --project-ref <ref>
pnpm exec supabase migration list --linked
pnpm exec supabase db push --dry-run
```

**Qué mirar** en el `--dry-run`: sólo las migraciones del repo más nuevas que la última de la nube, en orden.

- Si la nube tiene una migración que el repo no, **para**: alguien migró a mano. Se resuelve en el repo antes de seguir.
- Si una migración del repo es **más vieja** que la última de la nube (pasa con ramas en paralelo), `db push`
  la rechaza y te propone `--include-all`. No lo fuerces a ciegas: confirma que no depende del orden ni choca con lo ya aplicado y
  recién entonces agrega `--include-all` al `--dry-run` y al push; o pide a una sesión que la renumere con una fecha posterior en `main`.
- Los índices se crean sin `concurrently` (las migraciones van en transacción): en la demo el bloqueo es de segundos; con muchos datos,
  aplica en un horario tranquilo.

Recién con el `--dry-run` limpio:

```bash
pnpm exec supabase db push
pnpm exec supabase migration list --linked
pnpm exec supabase db diff --linked
```

**Qué mirar:** `migration list` alineado (cada migración con su fecha a los dos lados) y `db diff` dice que no hay cambios.

**La demo:** `.github/workflows/demo.yml` ya aplica las migraciones nuevas y despliega las funciones en cada integración a `main` que
toca `supabase/migrations/` o `supabase/functions/`, con la variable `DEMO_PROJECT_REF` y los secretos `SUPABASE_ACCESS_TOKEN` y
`SUPABASE_DB_PASSWORD` del repo. Ahí el `--dry-run` sirve para **confirmar que no queda nada pendiente**; en la pestaña Actions,
«Demo · migraciones y funciones» en verde. Para pausarla, quita la variable `DEMO_PROJECT_REF` antes de una integración y vuelve a
ponerla después (el job se salta y `demo.yml` no se toca); mientras falte, la demo se queda atrás.

## 5. Vault

`url_proyecto`, la URL del proyecto, la leen los jobs que llaman a las funciones. En el editor SQL del panel de Supabase:

```sql
do $$ begin
  if exists (select 1 from vault.secrets where name = 'url_proyecto') then
    perform vault.update_secret((select id from vault.secrets where name = 'url_proyecto'), 'https://<ref>.supabase.co');
  else
    perform vault.create_secret('https://<ref>.supabase.co', 'url_proyecto');
  end if;
end $$;
```

**Qué mirar:** `select name from vault.secrets order by 1` trae `url_proyecto`, `cotizacion:abierta` y `portal:sal` (las dos últimas las
crea la base); `select jobname from cron.job order by 1` trae los jobs del inventario del ensayo; a los pocos minutos,
`select status, count(*) from cron.job_run_details where start_time > now() - interval '15 minutes' group by 1` sin `failed`. Los
`integracion:*` no se crean aquí: los crea la app (paso 10).

## 6. VAPID

Las claves de las notificaciones, sin red:

```bash
pnpm exec web-push generate-vapid-keys
```

La pública va en Vercel (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, Production y Preview) y como secreto de la función `push`; la privada
(`VAPID_PRIVATE_KEY`) y `VAPID_SUBJECT` (`mailto:…`), sólo como secretos de `push`:

```bash
pnpm exec supabase secrets set NEXT_PUBLIC_VAPID_PUBLIC_KEY=… VAPID_PRIVATE_KEY=… VAPID_SUBJECT=mailto:…
```

**Qué mirar:** en `/perfil` se pueden encender las notificaciones (sin la pública dice «Falta la clave pública…») y una de prueba llega
con la app instalada. Cambiar las claves obliga a todos a volver a suscribirse.

## 7. Funciones edge

Con los secretos de `push` ya puestos (paso 6):

```bash
pnpm exec supabase functions deploy --use-api
```

**Qué mirar:** las cinco funciones desplegadas: `apibara`, `avatares-miniaturas`, `importar-csv`, `push` y `storage-gc`. En el panel
(Edge Functions), la verificación de JWT encendida sólo en `apibara`, como en `supabase/config.toml`. En la demo lo hace `demo.yml` al
integrar.

## 8. Auth

- **La demo:** `bash scripts/demo/restaurar.sh` sólo cuando se resetea (borra la base), o `pnpm exec supabase config push` con
  `.env.demo` cargado, que sube `[remotes.demo]`. Mira antes el ref enlazado.
- **Un cliente:** por el panel, con las rutas de `docs/ENTORNOS.md › «Auth en la nube»`; no se sube `[remotes.demo]` a un cliente.

**Qué mirar:** `env:check produccion`, lugar «Auth de Supabase», sin faltas (SMTP, las seis plantillas, Site URL, Redirect URLs y el
vencimiento en 86400), y un correo de recuperación de contraseña que llega con el remitente propio.

## 9. Correo y dominio

- **El proveedor:** `EMAIL_PROVEEDOR` y su clave en Vercel, y el SMTP de Auth (`docs/ENTORNOS.md › «Correo»`). Probarlo con
  `pnpm email:probar <destino>` y el proveedor real.
- **El dominio:** en Vercel (Settings › Domains); después, en Supabase, Site URL y Redirect URLs (en la demo, `DEMO_SITE_URL` en
  `.env.demo`) y, si la web pública usa otro dominio, su dirección en Integraciones (paso 10).

**Qué mirar:** el certificado emitido en Vercel; un enlace de ingreso por correo que abre el dominio nuevo; el SPF, el DKIM y el DMARC
verificados en el subdominio de envío.

## 10. Integraciones (en la app)

Con la cuenta dueña, Empresa › Integraciones: la clave de apibara (la guarda como `integracion:apibara`) y la web pública (su secreto,
`integracion:web_publica`, y la dirección a la que llama `web_revalidar_correr()`).

**Qué mirar:** la integración figura guardada; publicar un vehículo revalida la web pública.

## 11. La pasada final

`pnpm env:check produccion` otra vez, con las mismas variables del paso 2. **Qué mirar:** sale con `0`.

## Volver atrás

- **La app:** en el panel de Vercel, promover el despliegue anterior. Sólo sirve si el esquema que ya avanzó sigue siendo compatible con
  ese código; si no, primero la migración que deshace (abajo). Tras volver atrás, Vercel apaga la promoción automática de los
  despliegues siguientes hasta que lo deshagas.
- **Una función:** desplegarla desde el commit anterior, en un clon en ese commit.
- **Un secreto o una variable:** su valor anterior.
- **Una migración, nunca hacia atrás:** ni reset ni editar la migración aplicada. Se escribe una migración nueva que la deshaga
  (`.claude/rules/migraciones.md`) y se aplica con el paso 4; en la demo la aplica `demo.yml` al integrar. Si se perdió algo, el
  respaldo del paso 3 (o el diario del plan Pro, desde el panel, que reemplaza la base entera) es el último recurso; ninguno de los dos
  guarda los archivos de Storage.
- **El correo:** `docs/ENTORNOS.md › «Cambiar de Resend a Cloudflare»`, paso 5.

## Tras aplastar las migraciones

Las migraciones se aplastan con `pnpm db:aplastar` (sólo local; comprueba que la base queda idéntica). La base nueva lleva la versión de
la última que reemplaza, así que un proyecto que ya las tenía todas no la vuelve a correr. En ese proyecto hay que marcar las versiones
viejas como revertidas en su historial, **antes** de `db push` (paso 4):

- **La demo:** lo hace solo `demo.yml`.
- **Producción:** lo corre la persona con el proyecto enlazado (y su ref mirado): `bash scripts/demo/alinear-historial.sh`. No toca
  esquema ni datos; si al proyecto le faltaba alguna de las aplastadas, se niega y lo dice.

Producción todavía no existe: su primer despliegue aplica la base directamente y no necesita nada de esto.

## La instalación de un cliente

Un proyecto propio de Supabase y de Vercel (los crea la persona), **desde un clon aparte** del repo, con
`SUPABASE_PROJECT_REF=<ref del cliente>` exportada para `env:check produccion` y el ref enlazado mirado antes de cada orden. Los pasos
1 a 11, sin `demo.yml` (las migraciones a mano, paso 4) y nunca `restaurar.sh`. Tres de más:

- **Quitar el comodín de los previews** de las Redirect URLs (`docs/ENTORNOS.md › «Auth en la nube»`).
- **El dueño:** la primera cuenta, por `/registro`, enseguida de migrar y antes de compartir la URL (`docs/ENTORNOS.md › «Registro»`).
  `scripts/demo/sembrar.mjs` no: siembra datos de demo.
- **El registro cerrado** después (`ajustes_empresa.registro_abierto`): desde ahí sólo entran invitadas.

## Lo que sólo una persona comprueba

Cada uno con su abierto en `docs/PENDIENTES.md`; lo que salga se anota ahí (o se le pide a una sesión).

- **9-12** · Chrome con sesión y gestor de contraseñas, Live encendido: tipear y confirmar un monto en la hoja de cotizar, en
  escritorio y en el celular. **Bien:** no ofrece guardar nada. Si lo ofrece, se decide de nuevo.
- **Fotos en un iPhone** · desde Safari, subir a un vehículo una foto de la cámara (HEIC). **Bien:** se ve en la galería y en la
  miniatura de la lista, y el objeto del bucket es WebP.
- **9-6** · dos corridas de las carreras, una después de la otra y sin reintentos:

  ```bash
  gh workflow run ci.yml --ref main -f carreras=true -f e2e=false
  gh run list --workflow ci.yml -L 1
  ```

  Cada corrida en verde suma una fila a la cuenta de 9-6 (fecha, id, resultado). Con 5 de 5, una sesión pasa las carreras al job
  `base`; un rojo vuelve la cuenta a 0.

- **9-11** · en una rama descartable, un spec que cae a propósito:

  ```bash
  gh workflow run ci.yml --ref <rama> -f e2e=true
  gh run download <id> -n e2e-bloque-<n>-intento-1
  ```

  **Bien:** `e2e-fallos/` trae los cinco archivos de `scripts/ci/volcar-base.sh`, con contenido. Después, borrar la rama.

- **5a-4b** · decidir si vale una segunda pila local de Supabase para el e2e completo. Lo decidido hasta hoy es que no (los shards del
  CI son la salida).

## Lo que el panel de advisors muestra y está bien

- **Las 6 vistas `web.*` como `security_definer_view`** (ERROR): son la frontera pública de la web, a propósito.
- **Los WARN con su motivo** en `supabase/tests/advisors-con-motivo.json`, entre ellos `extension_in_public` y los `pg_graphql_*`.
  Desactivar `pg_graphql` quita estos últimos, pero cambia la plataforma: es opcional y lo decides tú.
- **Los de estadísticas** (`unused_index`, `table_bloat`) no cuentan: dependen del uso.
- **Dos avisos conocidos antes de abrir la web a tráfico real:** `web.registrar_evento` no acota `p_utm` ni la frecuencia;
  `web.solicitar_asesor` devuelve el WhatsApp de quien tenga una solicitud abierta aunque ya no esté en la rueda.
