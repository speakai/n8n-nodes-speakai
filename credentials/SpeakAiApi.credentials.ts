import {
	Icon,
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SpeakAiApi implements ICredentialType {
	name = 'speakAiApi';

	displayName = 'Speak AI API';

	documentationUrl = 'https://speakai.co';

	icon: Icon = { light: 'file:speakai.svg', dark: 'file:speakai.dark.svg' };

	properties: INodeProperties[] = [
		{
			displayName: 'Server URL',
			name: 'serverUrl',
			type: 'string',
			default: 'https://api.speakai.co',
			description: 'Base URL of the Speak AI API. Leave as the default unless you use a dedicated instance.',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Your Speak AI API key. Sent as the x-speakai-key header on every request.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-speakai-key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.serverUrl}}',
			url: '/v1/zapier/insights',
			qs: {
				pageSize: 1,
			},
		},
	};
}
