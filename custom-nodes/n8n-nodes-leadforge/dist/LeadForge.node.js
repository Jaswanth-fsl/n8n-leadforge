"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadForge = void 0;
class LeadForge {
    constructor() {
        this.description = {
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
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
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
exports.LeadForge = LeadForge;
