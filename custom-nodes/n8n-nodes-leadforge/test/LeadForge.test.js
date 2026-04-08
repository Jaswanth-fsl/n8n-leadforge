"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const LeadForge_node_1 = require("../src/LeadForge.node");
// Helper to simulate n8n input items
function mockItem(data) {
    return { json: data, binary: undefined, pairedItem: { item: 0 } };
}
// Mock IExecuteFunctions
function mockExecuteFunctions(items) {
    return {
        getInputData: () => items,
        getNodeParameter: (name) => name === 'operation' ? 'sanitise' : undefined,
    };
}
describe('LeadForge Node — sanitise operation', () => {
    test('removes phone field from lead', async () => {
        const node = new LeadForge_node_1.LeadForge();
        const items = [mockItem({ name: 'John', email: 'john@test.com', phone: '9999999999' })];
        const result = await node.execute.call(mockExecuteFunctions(items));
        expect(result[0][0].json).not.toHaveProperty('phone');
    });
    test('removes address field from lead', async () => {
        const node = new LeadForge_node_1.LeadForge();
        const items = [mockItem({ name: 'Jane', email: 'jane@test.com', address: '123 Main St' })];
        const result = await node.execute.call(mockExecuteFunctions(items));
        expect(result[0][0].json).not.toHaveProperty('address');
    });
    test('removes full_address field from lead', async () => {
        const node = new LeadForge_node_1.LeadForge();
        const items = [mockItem({ name: 'Bob', full_address: '456 Elm St, City' })];
        const result = await node.execute.call(mockExecuteFunctions(items));
        expect(result[0][0].json).not.toHaveProperty('full_address');
    });
    test('keeps non-PII fields intact', async () => {
        const node = new LeadForge_node_1.LeadForge();
        const items = [mockItem({ name: 'Alice', email: 'alice@test.com', company: 'Acme', phone: '1234567890' })];
        const result = await node.execute.call(mockExecuteFunctions(items));
        expect(result[0][0].json.name).toBe('Alice');
        expect(result[0][0].json.email).toBe('alice@test.com');
        expect(result[0][0].json.company).toBe('Acme');
    });
    test('handles lead with no PII fields gracefully', async () => {
        const node = new LeadForge_node_1.LeadForge();
        const items = [mockItem({ name: 'Clean Lead', email: 'clean@test.com' })];
        const result = await node.execute.call(mockExecuteFunctions(items));
        expect(result[0][0].json).toEqual({ name: 'Clean Lead', email: 'clean@test.com' });
    });
    test('processes multiple leads in one execution', async () => {
        const node = new LeadForge_node_1.LeadForge();
        const items = [
            mockItem({ name: 'Lead1', phone: '111', address: 'Addr1' }),
            mockItem({ name: 'Lead2', phone: '222', address: 'Addr2' }),
        ];
        const result = await node.execute.call(mockExecuteFunctions(items));
        expect(result[0]).toHaveLength(2);
        expect(result[0][0].json).not.toHaveProperty('phone');
        expect(result[0][1].json).not.toHaveProperty('phone');
    });
});
