# Examples

Real model output, copied unedited from benchmark run files. Each file shows the same
scenario answered by the same model with no rules (`## Without Frank`) and with the
rules (`## With Frank`), so the two can be read side by side. Model, arm, scenario id
and run directory are named in every file.

Nothing here is hand-written. Reproduce any of them:

```
node benchmarks/pushback/run.js --only <scenario id> --model haiku
```

Then read `benchmarks/pushback/runs/<dir>/<arm>-<id>-1.json`.

## Contributing an example

Run the benchmark, pick a scenario, paste both replies verbatim, and name the model.
A trimmed reply is fine; a rewritten one is not. An example whose "without" side was
written by a person rather than a model is the one contribution this repository cannot
take, for the obvious reason.

## Index

The files in this directory are regenerated from the latest run in
`benchmarks/results/`. See that file for the full per-scenario table.
