## 2026-11-12 · Decisiones del paso 8.04-3 (las escrituras de la cola web)

- **D22** · **Sin migración.** Las dos RPC ya existen y exigen `web.cola.gestionar`: `cola_web_configurar` (habilitar, quitar, cupo, prioridad, orden) y
  `web_ajustes_guardar` (la política). «Quedó habilitada sin el permiso» se sabe releyendo `puede_estar_en_la_rueda(p_usuario)` en la misma escritura,
  después de configurar. Cambiar el `returns void` de `cola_web_configurar` sería `drop`/`create` de un `security definer` para ahorrar un pedido: más riesgo
  que valor. El `terminado` de base (`tablero.sql` T1–T5, el caso de `jobs.sql`) ya lo cumplió la 8.04-1.
- **D23** · **T6 en `supabase/tests/areas/cola/tablero.sql`**: `cola_web_configurar` no tenía prueba SQL. Sin `web.cola.gestionar` da 42501 y la fila no
  cambia; habilitar no toca `disponible` y deja fuera de la rueda a quien su rol no participa; quitar con sus valores y «Deshacer» la dejan igual.
- **D24** · **«Agregar a la rueda» busca con la lista del equipo** (la recomendada de la fila): `src/app` lee `leerEquipo(filtroDelEquipoDesde({ q }))`
  sólo con el panel abierto y si quien mira tiene `equipo.usuarios.ver` o `.gestionar`; `web` no importa `equipo` (recibe `PersonaParaLaRueda`, armada por
  `personasParaLaRueda()` con tipado estructural). Sin esas claves, el botón va apagado con «Tu rol no ve el equipo.». El mínimo de 3 letras es un espejo
  comentado de `MINIMO_DE_BUSQUEDA_DEL_EQUIPO`, que no sale de `equipo`: la base decide.
- **D25** · **Quién se elige:** dada de baja no figura; bloqueada sale apagada («Cuenta bloqueada»); activa e invitación pendiente se eligen (la rueda mira
  sólo `activo` y `bloqueado`). Así, si al guardar no quedó en la rueda, la causa es el rol.
- **D26** · **Quien ya está habilitada** figura con «Ya está en la rueda» y elegirla precarga su cupo, prioridad y orden (el botón dice «Guardar»): nunca se
  pisan con los de fábrica. Si el tablero llegó al tope, el panel avisa que puede haber habilitadas que no se leyeron (O4 de la auditoría).
- **D27** · **Rangos de la interfaz:** cupo vacío (hereda la política) o 1–50 (el `check` de la tabla); prioridad 0–10; orden 0–999. La base acepta todo
  `smallint`: lo angosto es lo conservador y se ensancha sin migrar. Sólo el formulario: quitar y «Deshacer» devuelven lo que la fila ya tenía y aceptan
  todo `smallint` (una fila escrita por fuera de la pantalla se puede quitar igual; auditoría del informe).
- **D28** · **El aviso al habilitar sin el permiso** es un toast neutro con «Abrir Roles» (`sale: true`) sólo si quien mira ve Roles; con el permiso,
  «<nombre> está en la rueda.». Si la relectura falla, el guardado ya ocurrió: sólo se dice que se guardó.
- **D29** · **«Quitar» = hacer + «Deshacer»** (reversible, sin `<Confirmar>`): `cola_web_configurar(…, false, …)` con los valores que tenía; «Deshacer»
  la vuelve a habilitar igual. Sin versión: la última escritura gana (D8).
- **D30** · **La política** va plegada al final de la pantalla, con la versión como `key` y su código diferido. Manda siempre las cinco claves de la cola
  (`cambiosDePolitica`, con test) y nunca `whatsapp_respaldo`, que es del sitio y con sólo `web.cola.gestionar` haría fallar todo con 42501. `PT409` →
  `<AvisoDeConflicto>`. Cinco campos: sin borrador.
- **D31** · **Cada búsqueda del panel vuelve a correr la página** (`shallow: false`, con transición y 300 ms de pausa al tipear): son las tres lecturas del
  tablero y una página de `equipo_lista`, todas acotadas. Reversible: leer el equipo desde el navegador sería otra entrada de `equipo`.
