import { IExecuteFunctions } from 'n8n-workflow';
import { INodeExecutionData } from 'n8n-workflow';
import { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class LeadForge implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LeadForge',
		name: 'leadForge',
		group: ['transform'],
		version: 1,
		description: 'Sanitise lead data (remove PII)',
		defaults: {
			name: 'LeadForge',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Sanitise',
						value: 'sanitise',
					},
				],
				default: 'sanitise',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const item = items[i].json;

			// Clone object
			const cleaned = { ...item };

			// Remove PII fields
			delete cleaned.phone;
			delete cleaned.address;
			delete cleaned.full_address;

			returnData.push({
				json: cleaned,
			});
		}

		return [returnData];
	}
}