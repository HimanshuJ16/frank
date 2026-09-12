# Examples

Before/after exchanges. One file each.

Every file starts with a status line, and there are exactly two allowed values:

```
status: captured   host: Claude Code 2.1.x   model: claude-opus-5   date: 2026-09-12
status: illustrative
```

**captured** means the exchange happened and was copied out of a real transcript.
Trim it, don't rewrite it. Name the host and the model, because behavior differs
between them and a claim that doesn't name the model isn't a claim.

**illustrative** means someone wrote it to show the shape of the rule. It is a
drawing of the product, not evidence about it. It may never be used as proof, quoted
as a result, or shown in the README's before/after without the word alongside it.

A fabricated "baseline" transcript presented as captured is the one contribution this
project cannot accept. The whole package is about not doing that.

## Seeds

| file | shows |
|---|---|
| `pushback-cache-ttl.md` | The user pushes back on a correct answer. Frank HOLDs and names the cost. |
| `pushback-user-is-right.md` | The user is right. Frank UPDATEs and names the fact that changed it. |
| `false-done-tests.md` | "All tests pass" with nothing run. The gate asks. |

Still wanted, from real runs: an invented commit hash caught (`invented-hash.md`), and a
trivial exchange where the only difference is the missing "Great question!"
(`no-great-question.md`).
