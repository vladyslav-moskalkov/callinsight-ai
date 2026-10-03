# Validation and evidence

## Preparation checks

- Original cross-workflow references match the supplied stats/error exports.
- Four inactive copies contain 24 nodes and no credential bindings.
- Eight credential-bound nodes were scrubbed.
- Source node names/types/versions, four Code-node bodies, original prompts and each internal connection graph were preserved.
- Public chat disabled; private spreadsheet/workflow bindings replaced with explicit placeholders.
- No live service calls or activations performed by repository preparation.

## Source fingerprints

- call-stats.json: `9705acc90b621e023bfe88d79b42316bc4393518b0102d09cc13fa9927d3621c`
- audio-assistant.json: `699fc4bc1b623b5bc2d1b22ad01366f35bdfcce9d52bb3b4f120080e186871c2`
- error-handler.json: `ee17e3e6e6313e287554df9b89dfe04004ecb207ba0284178eccaaec97915540`
- audio-queue.json: `3abdc863449ec46ac0a1c0ea3f2b9c11abbab6c5d1e076bff44c90c4aa3ab747`

## Offline tests

Run `npm test` on Node.js 22 or newer. **40 tests passed, 0 failed** locally on Node.js 26.4.0 on 3 October 2026. GitHub Actions is configured for Node.js 22. Tests execute original Code-node JavaScript in isolated contexts with synthetic values and inspect graph/configuration/mappings.

They do not emulate the full n8n engine or execute IF/Set/tool nodes, measure AI accuracy, or establish real service integration. Tests of known failure modes pass when those limitations are reproduced, not when the limitation is repaired.

## Live validation still required

| Scenario | Required observation |
| --- | --- |
| Import/reconnect | All node versions compatible; stats and error references point to the intended imported workflows |
| Blank Status filter | Only the intended unprocessed test row is selected |
| Authorized Ukrainian audio | Transcript completes and word/duration fields are populated |
| Pending transcript | Poll interval/unit and termination policy are appropriate |
| Provider error | Error handler records message; original row/retry behavior is understood |
| Valid analysis JSON | Tone/category and processing metadata are saved to the same row |
| Malformed/incomplete model JSON | Failure is visible, with no misleading Done result |
| Speaker attribution | Customer vs manager speech is reviewed; tone quality is not assumed |
| Stats date range | Set-node output keys and inclusive boundaries match the manager's expectations |
| No calls/invalid dates | Distinguish no observations from positive customer sentiment |
| Repeated/overlapping execution | Demonstrate duplicate handling before claiming safe retries |
| Chat question | Tool inputs, permissions and answer agree with stored metrics |
| Costs | Compare actual provider usage/billing; do not use heuristic columns as invoices |

Record n8n version, fixture, timestamps, expected/actual output and a redacted execution trace. Any future timing claim needs a defined start/end, recording duration and representative samples.
