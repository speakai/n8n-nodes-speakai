import {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	NodeConnectionTypes,
} from 'n8n-workflow';

const SOURCE = 'n8n';

const EVENT_TO_WEBHOOK_EVENTS: Record<string, string[]> = {
	transcript: ['media.analyzed', 'media.reanalyzed'],
	captions: ['media.analyzed', 'media.reanalyzed'],
	sentiment: ['media.analyzed', 'media.reanalyzed'],
	magicPrompt: ['chat.status'],
	recording: ['embed_recorder.recording_received'],
};

function normalizeBaseUrl(serverUrl: unknown): string {
	const url = (serverUrl as string) || 'https://api.speakai.co';
	return url.replace(/\/+$/, '');
}

function firstOfArray(value: unknown): IDataObject | undefined {
	if (Array.isArray(value) && value.length > 0) {
		return value[0] as IDataObject;
	}
	return undefined;
}

export class SpeakAiTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Speak AI Trigger',
		name: 'speakAiTrigger',
		icon: { light: 'file:speakai.svg', dark: 'file:speakai.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts a workflow when Speak AI produces new insights, captions, magic prompt responses, or recordings',
		defaults: {
			name: 'Speak AI Trigger',
		},
		usableAsTool: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'speakAiApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'New Automated Transcription',
						value: 'transcript',
						description: 'Fires when a media item is analyzed or reanalyzed, hydrated with its transcript',
					},
					{
						name: 'New Captions (SRT/VTT)',
						value: 'captions',
						description: 'Fires when a media item is analyzed or reanalyzed, hydrated with its caption file',
					},
					{
						name: 'New Magic Prompts Response',
						value: 'magicPrompt',
						description: 'Fires when a magic prompt finishes, hydrated with the matching response',
					},
					{
						name: 'New Recording Captured',
						value: 'recording',
						description: 'Fires when an embed recorder captures a new recording',
					},
					{
						name: 'New Sentiment Analysis',
						value: 'sentiment',
						description: 'Fires when a media item is analyzed or reanalyzed, hydrated with its sentiment',
					},
				],
				default: 'transcript',
			},
			{
				displayName: 'Caption Format',
				name: 'fileType',
				type: 'options',
				options: [
					{
						name: 'SRT',
						value: 'srt',
					},
					{
						name: 'VTT',
						value: 'vtt',
					},
				],
				default: 'srt',
				displayOptions: {
					show: {
						event: ['captions'],
					},
				},
				description: 'The caption file format to hydrate',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				return typeof webhookData.webhookId === 'string' && webhookData.webhookId.length > 0;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const event = this.getNodeParameter('event') as string;
				const events = EVENT_TO_WEBHOOK_EVENTS[event] ?? [];

				const credentials = await this.getCredentials('speakAiApi');
				const baseUrl = normalizeBaseUrl(credentials.serverUrl);

				const response = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'speakAiApi',
					{
						method: 'POST',
						url: `${baseUrl}/v1/webhook`,
						body: {
							source: SOURCE,
							callbackUrl: webhookUrl,
							events,
							description: `n8n: ${event}`,
						},
						json: true,
					},
				);

				const webhookId = (response as IDataObject)?.data
					? ((response as IDataObject).data as IDataObject).webhookId
					: undefined;

				if (!webhookId) {
					return false;
				}

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = webhookId;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookId = webhookData.webhookId as string | undefined;

				if (!webhookId) {
					return true;
				}

				const credentials = await this.getCredentials('speakAiApi');
				const baseUrl = normalizeBaseUrl(credentials.serverUrl);

				try {
					await this.helpers.httpRequestWithAuthentication.call(this, 'speakAiApi', {
						method: 'DELETE',
						url: `${baseUrl}/v1/webhook/${webhookId}`,
						json: true,
					});
				} catch {
					return false;
				}

				delete webhookData.webhookId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();
		const query = this.getQueryData() as IDataObject;
		const event = this.getNodeParameter('event') as string;

		const credentials = await this.getCredentials('speakAiApi');
		const baseUrl = normalizeBaseUrl(credentials.serverUrl);

		const mediaId = (bodyData.mediaId ?? query.mediaId) as string | undefined;

		const doGet = async (path: string, qs: IDataObject): Promise<unknown> => {
			return this.helpers.httpRequestWithAuthentication.call(this, 'speakAiApi', {
				method: 'GET',
				url: `${baseUrl}${path}`,
				qs,
				json: true,
			});
		};

		let hydrated: IDataObject | undefined;

		if (event === 'transcript' && mediaId) {
			const result = await doGet('/v1/zapier/insights', {
				insightType: 'transcript',
				mediaId,
				pageSize: 1,
			});
			hydrated = firstOfArray(result);
		} else if (event === 'sentiment' && mediaId) {
			const result = await doGet('/v1/zapier/insights', {
				insightType: 'sentiment',
				mediaId,
				pageSize: 1,
			});
			hydrated = firstOfArray(result);
		} else if (event === 'captions' && mediaId) {
			const fileType = (this.getNodeParameter('fileType', 'srt') as string).toLowerCase();
			const result = await doGet('/v1/zapier/export', {
				mediaId,
				fileType,
			});
			hydrated = firstOfArray(result);
		} else if (event === 'recording' && mediaId) {
			const result = await doGet('/v1/zapier/insights', {
				uploadType: 'recorder',
				mediaId,
			});
			hydrated = firstOfArray(result);
		} else if (event === 'magicPrompt') {
			const result = (await doGet('/v1/zapier/prompts/history', { pageSize: 25 })) as IDataObject;
			const history = ((result?.data as IDataObject)?.history as IDataObject[]) ?? [];
			hydrated = history.find(
				(entry) =>
					(bodyData.messageId && entry.messageId === bodyData.messageId) ||
					(bodyData.promptId && entry.promptId === bodyData.promptId),
			);

			if (!hydrated) {
				hydrated = {
					promptId: bodyData.promptId,
					messageId: bodyData.messageId,
					prompt: bodyData.prompt,
					answer: bodyData.answer,
					mediaIds: bodyData.mediaIds,
					folderId: bodyData.folderId,
					state: bodyData.state,
				};
			}
		}

		if (!hydrated) {
			hydrated = { ...bodyData };
		}

		hydrated.id = bodyData.deliveryId ?? mediaId ?? bodyData.messageId;

		return {
			workflowData: [this.helpers.returnJsonArray([hydrated])],
		};
	}
}
