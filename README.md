# n8n-nodes-speakai

[![npm version](https://img.shields.io/npm/v/n8n-nodes-speakai)](https://www.npmjs.com/package/n8n-nodes-speakai)
[![npm downloads](https://img.shields.io/npm/dw/n8n-nodes-speakai)](https://www.npmjs.com/package/n8n-nodes-speakai)

An [n8n](https://n8n.io) community node for [Speak AI](https://speakai.co). Upload media and text for transcription and analysis, run AI Chat, look up media, and trigger workflows automatically when Speak AI produces new insights.

[n8n](https://n8n.io) is a fair-code licensed workflow automation platform.

## Installation

Follow the n8n [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) and use the package name `n8n-nodes-speakai`, or install it directly:

```bash
npm install n8n-nodes-speakai
```

## Credentials

Both nodes use the **Speak AI API** credential:

| Field | Description |
| --- | --- |
| Server URL | Base URL of the Speak AI API. Defaults to `https://api.speakai.co`. |
| API Key | Your Speak AI API key. Create one in your Speak AI account under **Settings → API Keys**. |

## Nodes

### Speak AI

An action node with four operations:

- **Upload File to Transcribe & Analyze** — send an audio or video URL for transcription and analysis.
- **Upload Text Note to Analyze** — send raw text for analysis.
- **Run AI Chat** — ask a question against a folder or a set of media.
- **Find Media by ID** — look up a single media item and its insights.

### Speak AI Trigger

A webhook trigger node. Pick one event; the node registers a webhook with Speak AI when the workflow is activated and removes it when the workflow is deactivated.

| Event | Fires when |
| --- | --- |
| New Automated Transcription | A media transcript is ready |
| New Captions (SRT/VTT) | Caption files are ready |
| New Sentiment Analysis | Sentiment analysis is ready |
| New AI Chat Response | An AI Chat response is ready |
| New Recording Captured | A recorder submission is received |

Each emitted item carries a stable `id`, so repeated deliveries and re-analysis are not deduplicated away.

## Resources

- [Speak AI](https://speakai.co)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## Support

Questions or issues? Contact [accounts@speakai.co](mailto:accounts@speakai.co).

## Credits

Created by [Vatsal Shah](https://github.com/vatsal2210).

## License

[MIT](LICENSE.md)
