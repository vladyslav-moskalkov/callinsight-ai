# Known limitations

These observations come from static export review and selected offline Code-node tests. No new live execution or accuracy benchmark was performed.

## Queue and reliability

- One blank-status row is selected per scheduled execution. The two-minute trigger is not proof of capacity for the scenario's 30–40 calls/day.
- There is no visible Processing lock or idempotency key. Overlapping executions can select the same row; a failed row can be selected again on a later run.
- The URL extractor assumes a Google Drive `/d/{id}` URL. Missing/malformed or differently formatted URLs can throw.
- Extracting a download URL does not make an inaccessible recording available to AssemblyAI.
- The polling loop has no visible maximum attempts or explicit timeout/backoff policy. The source Wait node has no explicit unit in its export; verify its imported configuration.
- The error handler appends time/message, but does not mark the original queue row Failed, retry safely or populate Execution link.
- There is no atomic transaction between provider calls and the final sheet update.

## Transcript and AI output

- The workflow asks AssemblyAI for speaker labels, but prepends `Клієнт:` to the whole transcript. It does not use utterance-level speaker attribution to isolate the customer's speech.
- Both OpenAI nodes use `gpt-5-mini`. Prompts remain Ukrainian.
- The analysis asks for JSON but uses direct `JSON.parse`. Fenced/malformed JSON fails; required fields, tone enumeration and audio URL are not schema-validated.
- The model-returned audio URL is trusted and written back to the row.
- Summary is produced by the parser but omitted from the sheet mapping.
- Transcript content can influence model instructions; no dedicated prompt-injection control is visible.

## Statistics

- The tool reads the same Calls sheet updated by the queue, not a separate analytics-result table.
- Only rows with exact Status `Done` count. Negativity uses exact Tone `Негативний`; variations and alternative labels do not count as negative.
- Filtering is by `Processed At`, not the time the call occurred.
- JavaScript Date parsing and `end.setHours(23,59,59,999)` depend on runtime timezone/input format. Invalid/reversed ranges silently yield zero rather than a validation error.
- Zero completed calls returns 0% negativity; this means no observations, not proof of satisfaction.
- The percentage is rounded to a whole number.
- The Result node exports two field-name strings prefixed with `=`. Verify their evaluated output keys after import; offline tests do not emulate n8n Set-node expression evaluation.
- The assistant has no visible persistent chat-memory node. Tool use and answer accuracy need separate live tests.

## Cost estimates and evidence

The source sheet expressions estimate transcription cost as duration-hours × 0.15, and LLM cost as transcript word-count × 0.00001, both formatted to six decimals. They are unverified heuristics, not current provider prices or actual token-based billing. Retaining them preserves the source; it does not endorse their accuracy.

The Notion case lists GPT-4o and a separate output table, while the supplied export uses `gpt-5-mini` and updates the queue itself. This repository follows the export. Notion was not changed during packaging.

The portfolio's under-three-minute result is a previously reported demonstration observation, not reproduced here. Recording duration, execution samples, timing breakdown and source n8n application version were not supplied.

Before real use, version and test improvements to access control, URL/date validation, bounded polling, row locking, structured output, speaker attribution, logging and accurate cost accounting.
