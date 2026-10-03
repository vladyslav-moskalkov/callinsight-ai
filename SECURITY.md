# Security and data handling

## Public-export preparation

The original exports are not included. The public copies have eight credential bindings, spreadsheet identifiers, workflow-instance identifiers, cached resource URLs and webhook identifiers removed. Pinned execution data is cleared and activation is disabled.

The assistant's source chat trigger was public. The public-copy setting is intentionally changed to `public: false` so importing a demo does not enable that public endpoint. This is a security preparation change, not a claim that full access control has been implemented.

The stats-tool and error-workflow references are placeholders that must be reconnected locally. Original workflow names, node names/versions, internal graph topology, Code-node JavaScript and prompts are preserved.

## Data flow

- Google Sheets supplies a recording URL and processing metadata.
- AssemblyAI receives the audio URL and fetches the recording for transcription.
- OpenAI receives the transcript and recording URL for classification.
- The statistics tool reads the Calls sheet and returns aggregate metrics to the chat agent.
- n8n execution history and the error sheet can retain sensitive content or identifiers.

Use synthetic or properly authorized test recordings. Do not make real customer recordings public merely to make a download link work. Review lawful recording/access permissions, vendor data handling, retention and deletion before connecting real data.

## Operational safeguards before real use

Restrict spreadsheet/Drive access and the chat endpoint. Protect credentials in n8n's credential store. Add reviewed input validation, access controls, polling limits, idempotency/row locking and failure recovery. Review transcript prompt injection and model-output schemas.

Error text can contain private URLs or data. Redact shared logs and screenshots, and set an explicit retention policy for recordings, transcripts, execution history and error entries.

Do not commit API keys, real audio URLs, customer transcripts or execution exports. Report repository security concerns privately through [LinkedIn](https://www.linkedin.com/in/vladyslav-moskalkov/), without posting sensitive details in a public issue.
