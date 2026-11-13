## Paso 9.13-2 · Despliegue en seco: el guion, el revisor de la base y la guarda (2026-11-13)

- **`pnpm despliegue:en-seco`** (`scripts/despliegue/en-seco.sh`) corre dentro de un solo candado, en este orden: la base desde cero (con un reintento),
  `db:probar`, `db:lint`, la base contra el repo, `env:check produccion` sin entorno y `next build` en `.next-e2e`. Un paso que cae no corta los demás.
  Termina con «Para la persona» y `listo`, o con `falta:` y la lista. La corrida de la sesión terminó en `listo`: base 31 s, `db:probar` 278 s,
  `db:lint` 2 s, revisor < 1 s, variables 1 s, build 79 s en frío y 10 s con caché (`.piloto/salidas/9.13/en-seco.txt`). Para la persona deja: crear
  `url_proyecto` en Vault (en local lo pone la semilla), los `integracion:*` los crea la app, los tres secretos VAPID de `push`, la URL de
  `web_revalidar_correr()` en Integraciones, y correr `env:check` de producción con las credenciales.
- **El revisor** (`scripts/despliegue/revisar-base.mjs`, con `pg`, sólo base local) corre `supabase/tests/advisors.sql` contra la base real con
  splinter y los schemas de `[api]` (690 avisos, también `web`). Además mira el sentido inverso de la lista (un motivo de un aviso que ya no existe),
  `db:lint` contra `db_lint` (37 funciones) y el inventario: 19 jobs, 9 buckets, 3 nombres de Vault, 5 funciones con sus secretos y `[functions.*]`,
  las 4 funciones edge que llama la base y el webhook `trg_notificaciones_push → push`. La lógica es pura y probada (`en-seco.test.ts`, 10 pruebas
  con una base simulada; cada extractor cuenta lo que no entiende).
- **El CI** (job `base`) deja el `grep '|ERROR|'` sobre `public` y corre el revisor: arregla el hallazgo de la 9.13-1 (el CI no veía los 6 ERROR de las
  vistas `web`) con la misma regla que `db:probar`. La línea `- run: pnpm db:lint` queda, porque es el ancla de tres mutaciones de `workflows.test.ts`.
- **La guarda** `scripts/guardas/despliegue-sin-remoto.test.ts`: ninguna línea de `scripts/despliegue/` (comentarios incluidos; los `*.test.ts` no)
  tiene una orden contra el proyecto remoto, una API de gestión, una credencial nombrada, un `fetch(`, la CLI directa o una URL de Postgres no
  local, y `env:check produccion` corre con `env -i`. Cada regla tiene un caso que cae y uno parecido que no.
- **La lista de avisos:** las 3 RPC de `anon` llevan `funcion` y `huella` (`md5(prosrc)`) y `advisors.sql` cae si un cuerpo cambia (con su caso
  sintético). El comodín de GraphQL se queda: `pg_graphql` no está en la base local (medido), y el sentido inverso lo exime sólo sin la extensión.
  Los motivos de las 9 funciones «IMMUTABLE sobre STABLE» están reescritos una por una (`.piloto/salidas/9.13-2/c16-cuerpos.txt`). Ninguna sostiene
  un índice, un default ni un check, y ninguna cambia con la sesión en un camino real. No propongo ningún abierto.
- **Objeción 6 de la auditoría de la 9.13-1:** los EXPLAIN de las funciones sql que se inlinean ahora están guardados con su consulta
  (`.piloto/salidas/9.13-2/inlinea-con-consulta.txt`). Las cuatro consultas (`_motor_*`, `_lead_visible_para`, `leads_vista_por_ids`,
  `datos_exportar_leads`) dan «inlineada».
- **Una prueba inestable de `db:probar`, arreglada:** la primera corrida del guion cayó en `importar-lotes` (el lote de vehículos daba
  `rechazadas: 2`). Sola pasaba, y `db:probar` entero otra vez dio 1.484 en verde con el mismo código. Causa: el test tomaba el primer origen activo
  por id (un uuid al azar), y a veces tocaba uno que otro archivo había dejado creado. `importar-lotes.sql` e `importar-crear.sql` ahora toman el más
  antiguo (`creado_en, clave`), que es de la base.
- **Medido en el paso 0:** H1, `pg_graphql` no está instalado en la base del carril. H2, `pg` devuelve una lista para varias sentencias. H3,
  `env -i … pnpm env:check produccion` sale con 2 y los cuatro lugares dan «no se pudo leer». H4, `SUPABASE_DB_LOCAL` del CI es `127.0.0.1`.
- e2e completo: no (9.13-2, Nivel 1: guion y revisor de la base, sin interfaz; lo prueba el CI del PR; dirigidos: ninguno)
- **Lo que sigue: 9.13-3** — la guía (un `DESPLIEGUE.md` nuevo en `docs/` y `docs/ENTORNOS.md`; alcance, archivos y precondiciones en `.piloto/planes/9.13.md` ›
  «Partición» › «9.13-3, servida»). Cita las líneas «Para la persona» de `.piloto/salidas/9.13/en-seco.txt`.
