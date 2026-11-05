# ¿Esta sesión escribió en el árbol $raiz? Lee el transcript (JSONL) de la sesión. Cuenta como escribir: Edit/Write/MultiEdit/NotebookEdit sobre un
# archivo de $raiz, o un Bash que escribe (redirección, git commit/add/apply…, cp/mv/rm/tee/touch/mkdir, sed -i, pnpm add/up/remove, supabase
# migration) y no empieza con `cd` a una ruta absoluta de fuera de $raiz (la sesión trabajó en otro árbol). Lo dudoso cuenta como «sí»: en caso
# de duda se verifica, como antes. Lo usa verificar-al-terminar.sh, y se prueba en scripts/guardas/verificar-al-terminar.test.ts.
def en_otro_arbol:
  (capture("^\\s*cd\\s+[\"']?(?<d>/[^\\s\"';&|]*)") // null) as $c
  | $c != null and (($c.d | startswith($raiz)) | not);
def escribe:
  test("(^|[^0-9&>])>{1,2}\\s*[^&\\s]|git\\s+(commit|add|apply|merge|rebase|cherry-pick|restore|checkout|reset)|(^|[;&|(\\s])(cp|mv|rm|tee|touch|mkdir)\\s|sed\\s+-i|pnpm\\s+(add|up|remove)|supabase\\s+migration");
[inputs | .message.content? | arrays | .[] | select(.type == "tool_use")]
| any(.[];
    ((.name | IN("Edit", "Write", "MultiEdit", "NotebookEdit"))
      and ((.input.file_path // .input.notebook_path // "") | startswith($raiz)))
    or (.name == "Bash" and ((.input.command // "") | (escribe and (en_otro_arbol | not)))))
