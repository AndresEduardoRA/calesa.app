-- Lo último que corre el seed (el orden está en `config.toml`, `[db.seed] sql_paths`): con todas las filas ya sembradas.
-- Estadísticas iniciales (cierre 4). Tras un `db reset` (o el primer `db push --include-seed`) ninguna tabla tiene estadísticas hasta que
-- el autovacuum las analiza, minutos después de las primeras filas: sin ellas el planificador elige mal los planes de las RPC y la
-- primera importación de 500 filas tardaba ~20 s (lotes de 3,8 s contra el corte de 8 s de `authenticated`); con ellas, ~1 s
-- (`docs/RENDIMIENTO.md`, «B. Importar 500 filas»). Un `analyze` aunque las tablas estén casi vacías ya lo evita.
do $$
declare v_tabla record;
begin
  for v_tabla in select schemaname, tablename from pg_tables where schemaname in ('public', 'web') loop
    execute format('analyze %I.%I', v_tabla.schemaname, v_tabla.tablename);
  end loop;
end $$;
