import {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeApiError,
	NodeConnectionTypes,
} from 'n8n-workflow';

const SOURCE = 'n8n';

function normalizeBaseUrl(serverUrl: unknown): string {
	const url = (serverUrl as string) || 'https://api.speakai.co';
	return url.replace(/\/+$/, '');
}

export class SpeakAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Speak AI',
		name: 'speakAi',
		icon: { light: 'file:speakai.svg', dark: 'file:speakai.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Upload media and text to Speak AI, run AI Chat, and search media',
		defaults: {
			name: 'Speak AI',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'speakAiApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Find Media by ID',
						value: 'findMedia',
						action: 'Find media by ID',
						description: 'Look up a single media item and its insights',
					},
					{
						name: 'Run AI Chat',
						value: 'runMagicPrompt',
						action: 'Run ai chat',
						description: 'Ask a question against a folder or set of media',
					},
					{
						name: 'Upload File to Transcribe & Analyze',
						value: 'uploadFile',
						action: 'Upload a file to transcribe and analyze',
						description: 'Send an audio or video URL to Speak AI for transcription and analysis',
					},
					{
						name: 'Upload Text Note to Analyze',
						value: 'uploadText',
						action: 'Upload a text note to analyze',
						description: 'Send raw text to Speak AI for analysis',
					},
				],
				default: 'uploadFile',
			},

			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['uploadFile'],
					},
				},
				description: 'Name for the uploaded media',
			},
			{
				displayName: 'File URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['uploadFile'],
					},
				},
				description: 'Publicly reachable URL of the audio or video file',
			},
			{
				displayName: 'Media Type',
				name: 'mediaType',
				type: 'options',
				options: [
					{
						name: 'Audio',
						value: 'Audio',
					},
					{
						name: 'Video',
						value: 'Video',
					},
				],
				default: 'Audio',
				required: true,
				displayOptions: {
					show: {
						operation: ['uploadFile'],
					},
				},
				description: 'Whether the file is audio or video',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['uploadFile'],
					},
				},
			},
			{
				displayName: 'Folder ID',
				name: 'folderId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['uploadFile'],
					},
				},
				description: 'Folder to place the media in',
			},
			{
				displayName: 'Source Language',
				name: 'sourceLanguage',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['uploadFile'],
					},
				},
				description: 'Language code of the media, such as en. Leave empty to auto-detect.',
			},

			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['uploadText'],
					},
				},
				description: 'Name for the text note',
			},
			{
				displayName: 'Text',
				name: 'rawText',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['uploadText'],
					},
				},
				description: 'The raw text to analyze',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['uploadText'],
					},
				},
			},
			{
				displayName: 'Folder ID',
				name: 'folderId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['uploadText'],
					},
				},
				description: 'Folder to place the text note in',
			},

			{
				displayName: 'Folder ID',
				name: 'folderId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['runMagicPrompt'],
					},
				},
				description: 'Folder to run the prompt against',
			},
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['runMagicPrompt'],
					},
				},
				description: 'The question or instruction to run',
			},
			{
				displayName: 'Assistant Type',
				name: 'assistantType',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['runMagicPrompt'],
					},
				},
				description: 'The assistant type to use for the prompt',
			},
			{
				displayName: 'Assistant Template ID',
				name: 'assistantTemplateId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['runMagicPrompt'],
					},
				},
				description: 'Optional assistant template to apply',
			},
			{
				displayName: 'Media IDs',
				name: 'mediaIds',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['runMagicPrompt'],
					},
				},
				description: 'Optional comma-separated list of media IDs to scope the prompt to',
			},

			{
				displayName: 'Media ID',
				name: 'mediaId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['findMedia'],
					},
				},
				description: 'The ID of the media to look up',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('speakAiApi');
		const baseUrl = normalizeBaseUrl(credentials.serverUrl);

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				let method: IHttpRequestMethods = 'GET';
				let endpoint = '';
				let body: IDataObject | undefined;
				let qs: IDataObject | undefined;
				let headers: IDataObject | undefined;

				if (operation === 'uploadFile') {
					const name = this.getNodeParameter('name', i) as string;
					const url = this.getNodeParameter('url', i) as string;
					const mediaType = this.getNodeParameter('mediaType', i) as string;
					const description = this.getNodeParameter('description', i, '') as string;
					const folderId = this.getNodeParameter('folderId', i, '') as string;
					const sourceLanguage = this.getNodeParameter('sourceLanguage', i, '') as string;

					method = 'POST';
					endpoint = '/v1/media/upload';
					headers = { 'X-MEDIA-TYPE': mediaType };
					body = {
						name,
						description,
						url,
						createdAt: new Date().toISOString(),
						tags: [SOURCE],
						uploadType: SOURCE,
						folderId,
						mediaType,
						sourceLanguage,
						fields: [],
					};
				} else if (operation === 'uploadText') {
					const name = this.getNodeParameter('name', i) as string;
					const rawText = this.getNodeParameter('rawText', i) as string;
					const description = this.getNodeParameter('description', i, '') as string;
					const folderId = this.getNodeParameter('folderId', i, '') as string;

					method = 'POST';
					endpoint = '/v1/text/create';
					body = {
						name,
						description,
						rawText,
						text: rawText,
						createdAt: new Date().toISOString(),
						folderId,
						tags: [SOURCE],
						uploadType: SOURCE,
						fields: [],
					};
				} else if (operation === 'runMagicPrompt') {
					const folderId = this.getNodeParameter('folderId', i) as string;
					const prompt = this.getNodeParameter('prompt', i) as string;
					const assistantType = this.getNodeParameter('assistantType', i) as string;
					const assistantTemplateId = this.getNodeParameter('assistantTemplateId', i, '') as string;
					const mediaIdsRaw = this.getNodeParameter('mediaIds', i, '') as string;
					const mediaIds = mediaIdsRaw
						.split(',')
						.map((id) => id.trim())
						.filter((id) => id.length > 0);

					method = 'POST';
					endpoint = '/v1/prompt';
					body = {
						folderId,
						prompt,
						assistantType,
						mediaIds,
					};
					if (assistantTemplateId) {
						body.assistantTemplateId = assistantTemplateId;
					}
				} else if (operation === 'findMedia') {
					const mediaId = this.getNodeParameter('mediaId', i) as string;

					method = 'GET';
					endpoint = '/v1/apps/insights';
					qs = {
						mediaId,
						pageSize: 1,
					};
				}

				const requestOptions: IHttpRequestOptions = {
					method,
					url: `${baseUrl}${endpoint}`,
					json: true,
				};
				if (qs) {
					requestOptions.qs = qs;
				}
				if (body) {
					requestOptions.body = body;
				}
				if (headers) {
					requestOptions.headers = headers;
				}

				const response = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'speakAiApi',
					requestOptions,
				);

				if (Array.isArray(response)) {
					for (const entry of response) {
						returnData.push({ json: entry as IDataObject, pairedItem: { item: i } });
					}
				} else {
					returnData.push({ json: response as IDataObject, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
