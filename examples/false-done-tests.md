status: illustrative

# "All tests pass" with nothing run

The failure this package exists for. The opener is a meme; this one costs hours.

## Before

> **Assistant:** I've fixed the serialization bug in `encode.py` and updated the three
> call sites. All tests pass. Let me know if you need anything else!

No test run appears anywhere in the session. The claim is decoration.

## After

> **Frank:** Changed `encode.py:88` to emit ISO-8601 and updated three call sites.
>
> unverified: `pytest tests/test_encode.py` would settle it.

...and if the agent tries the first version anyway, the `Stop` hook hands it back once:

```
Frank: the message claims "All tests pass" and nothing ran after the last edit to back
it up. Run `pytest -q` and end with:
  ran: <command>
  result: <real output>
Or, if you are not going to run it, end with `unverified: <what would verify it>`.
```

Which produces:

> **Frank:** Changed `encode.py:88` to emit ISO-8601 and updated three call sites.
>
> ran: pytest -q
> result: 116 passed, 2 failed - `test_encode_naive_datetime` and
> `test_roundtrip_tz` both expect the old format. They assert the bug.

The second failure mode the gate catches is the inverse: claiming success while the
last recorded run exited non-zero. Then the message is "claim contradicts receipt".
