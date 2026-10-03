# Setup guide

## Prerequisites

Use a separate n8n test environment, Google Sheets/Drive test resources, AssemblyAI credentials and OpenAI access to `gpt-5-mini`. The source n8n application version was not supplied; check compatibility with the retained node versions.

## Import and reconnect

1. Import [error-handler.json](../workflows/error-handler.json) and [call-stats.json](../workflows/call-stats.json).
2. Import [audio-queue.json](../workflows/audio-queue.json) and [audio-assistant.json](../workflows/audio-assistant.json). Keep all four workflows inactive while configuring.
3. Reconnect Google Sheets credentials in the four sheet nodes, AssemblyAI Header Auth in both HTTP nodes, and OpenAI credentials in both model nodes.
4. Replace `REPLACE_WITH_QUEUE_SPREADSHEET_ID` consistently in the queue reader, queue updater and stats reader. All three must use the same Calls tab.
5. Replace `REPLACE_WITH_ERROR_SPREADSHEET_ID` and select the Errors tab.
6. In the assistant tool node, replace `REPLACE_WITH_STATS_WORKFLOW_ID` with the imported stats workflow.
7. In the queue workflow's Settings → Error workflow, select the imported error handler instead of `REPLACE_WITH_ERROR_WORKFLOW_ID`.
8. Check the wait node's interval/unit in your environment. The retained source node is named `Wait 1 sec` and exports `amount: 1`, without an explicit unit.
9. Confirm that the assistant chat remains restricted. Configure appropriate access controls before intentional deployment.

For AssemblyAI Header Auth, use header name `Authorization` and your API key as its value. The source sends `speech_models: ["universal-2"]`, `language_code: "uk"`, `speaker_labels: true` and `speakers_expected: 2`. Verify current model/language compatibility against the [official transcription reference](https://www.assemblyai.com/docs/pre-recorded-audio/api-reference/transcripts/submit). Do not paste keys into workflow JSON.

## Calls sheet

Create these headers, preserving the source spellings:

- `Recording URL`
- `Status`
- `Processed At`
- `Price USD, transcribation`
- `Price USD, LLM`
- `Call duration`
- `Call word count`
- `Tone`
- `Category`

The reader selects a blank Status and returns the first match. Confirm that the imported Sheets filter actually matches blanks in your n8n version. `row_number` is the Sheets node's row identifier, not a manually entered business field.

The source rewrites Recording URL with the model-returned `audio_url` and sets Status to `Done`. Summary is not persisted. Cost fields are retained heuristic estimates, not billing.

## Errors sheet

Use headers `Created At`, `Text` and `Execution link`. Only Created At and Text are mapped by the original handler; Execution link is not populated.

n8n requires an error workflow to be selected for the main workflow. See [official error-handling guidance](https://docs.n8n.io/flow-logic/error-handling/). Test an eligible failing execution, not only the handler's appearance on the canvas.

## Safe demonstration

The [queue examples](../examples/queue-rows.json) contain a deliberately non-working Google Drive identifier. They are for offline checks only. For a live test, use an authorized synthetic audio recording that AssemblyAI can access, without exposing real customer audio.

Complete [validation](VALIDATION.md), check costs in the actual service dashboards and review [limitations](LIMITATIONS.md). This package does not activate your live workflows.
