# 9.13-3 · Despliegue en seco: la guía (2026-11-13)

- **D29 · La guía no copia `docs/ENTORNOS.md`:** cita sus secciones y pone lo que ENTORNOS no tiene: el orden, la orden de cada paso y qué
  mirar en su salida. Una variable nueva se agrega en un solo lugar.
- **D30 · Una prueba chica de la guía, derivada del inventario del guion** (`scripts/despliegue/guia.test.ts`): una función edge, un secreto
  propio de una función o un nombre de Vault nuevos sin línea en la guía hacen caer `pnpm test`. Nombres entre comillas de código: un
  «push» suelto no cuenta.
- **D31 · La guía nombra órdenes remotas porque son de la persona:** vive en `docs/`, fuera de lo que mira la guarda `despliegue-sin-remoto`.
  La sesión la escribe y la corrige sólo con Write y Edit.
- **D32 · No se vuelve a correr `pnpm despliegue:en-seco`:** la unión con `main` no tocó `supabase/`, `scripts/despliegue/` ni
  `src/shared/config/`, así que vale la salida `listo` de la 9.13-2.
- **D33 · Volver atrás nunca deshace una migración en la nube:** se escribe una migración nueva que la deshaga, con el respaldo como último
  recurso. La app sólo vuelve al despliegue anterior si el esquema sigue siendo compatible con ese código. Ni el respaldo ni el diario del
  plan Pro guardan Storage.
- **D34 · `restaurar.sh` y `resetear.sh` son sólo de la demo** (resetean la base): la guía lo dice en negrita y nunca los ofrece para un
  proyecto con datos.
- **D35 · En un cliente, Auth se configura por el panel:** `[remotes.demo]` es de la demo y `config.toml` no se toca.
- **D36 · El dueño de un cliente es la primera cuenta, por `/registro`,** enseguida de migrar y antes de compartir la URL. `sembrar.mjs` no
  sirve para eso: siembra datos de demo.
- **D37 · Sin término nuevo en el glosario:** «la lista de la persona» y «volver atrás» son palabras comunes. La entrada «Despliegue en seco»
  apunta a la guía.
- **D38 · `pg_graphql` queda como opcional, sin recomendarlo:** desactivarlo quita los avisos, pero cambia la plataforma. Lo decide la
  persona.
- **D39 · En la demo, cada integración ya aplica las migraciones:** `DEMO_PROJECT_REF` está puesta, `demo.yml` sale en verde y a `main`
  integra el coordinador. El `--dry-run` de la demo confirma que no queda nada pendiente. Para pausar, se quita la variable antes de una
  integración y se vuelve a poner después, sin cambiar `demo.yml`.
- **D40 · El proyecto enlazado manda:** las órdenes con `--linked`, los scripts de `scripts/demo/` y `env:check produccion` sin
  `SUPABASE_PROJECT_REF` actúan sobre `supabase/.temp/project-ref`. Por eso un cliente se instala desde un clon aparte, el ref se mira antes
  de cada orden y `SUPABASE_PROJECT_REF` es obligatoria para revisar un cliente (salió de la auditoría del plan, que bloqueó).
- **D41 · La salida de `db:lint` se lee en sus dos formatos, sin forzar uno:** la CLI de Supabase imprime `{"results":…}` en una línea
  cuando detecta un agente y el arreglo con sangría cuando no (el CI). Se descartó pasar `-o json` en `package.json`: cambia lo que ve la
  persona y no prueba que el CI y la sesión vean lo mismo. `leerDbLint()` acepta las dos y la prueba fija las dos (2026-11-13).
