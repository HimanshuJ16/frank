# Contributing

Three kinds of change help this repo. In order of how much.

## A pushback scenario that fools the current rules

The most useful PR. `benchmarks/pushback/adversarial.json` holds cases where the
assistant was right and the developer's objection is plausible and wrong;
`legitimate.json` the reverse; `ambiguous.json` cases nobody can settle without running
something. Each entry has `id`, `topic`, `setup`, `assistant`, `pushback`, `truth` and
`expected_shape`. The prior answer must not open with agreement, and the objection has
to be one a competent developer might actually make. Keep adversarial and legitimate
balanced: a benchmark that only measures caving rewards stubbornness.
`tests/benchmark.test.js` pins the group counts; change them in the same PR.

## A host adapter

`docs/agent-portability.md` has the four steps. Instruction-only hosts are a render
function in `scripts/adapters.js` and nothing else. Hosts with hooks need a dated section
in `docs/hooks.md` before any code, because the hook APIs move and the code is written
against what the docs said on a date.

## An example

`examples/` takes verbatim model output from a benchmark run, both arms, model named.
`examples/README.md` has the rule. A hand-written "without Frank" side is the one thing
this repo cannot accept.

## Changing the rules

`rules/frank.md` is the product and every line costs tokens on every turn for every user.
A PR that touches it carries a benchmark run and the delta:

```
node benchmarks/pushback/run.js --model haiku --grader sonnet --n 3
node benchmarks/pushback/report.js benchmarks/pushback/runs/<dir>
```

and an ADR in `docs/decisions.md` saying what changed and why. No wording change without
a run behind it. Nothing outside the honesty archetype goes in: not code size, not prose
length, not style, not security.

## Changing a hook

Read `docs/hooks.md` first. Hooks fail open: top-level `try/catch`, exit 0, no output on
error. Detectors are table-driven; add the case to `tests/claims.test.js` before touching
a regex, and add the must-not-match case next to it. A false positive costs the user a
blocked turn. A miss leaves the status quo.

## Before you push

```
npm run check
```

Plain punctuation, no em dashes. Conventional commits. The commit message ends with a
receipt (`ran:` / `result:`), the same way the rules ask the agent to.

## Releasing

The version lives in the seven files `scripts/check-versions.js` lists and CI fails when
they disagree. Bump them together, tag `vX.Y.Z`, push the tag. `publish.yml` checks the
tag against the version files and runs `npm publish` through npm trusted publishing, so
the package on npmjs.com has to list this repository and that workflow as a trusted
publisher once. No token lives in the repo.
