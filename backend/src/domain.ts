export const transitions: Record<string, string[]> = { PENDING: ['CONFIRMED', 'REJECTED', 'CANCELLED'], CONFIRMED: ['PREPARING', 'CANCELLED'], PREPARING: ['READY', 'CANCELLED'], READY: ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'], OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'], DELIVERED: [], CANCELLED: [], REJECTED: [] };
export function canTransition(from: string, to: string) { return (transitions[from] || []).includes(to); }
export function priceOrder(lines: {
    quantity: number;
    price: number;
}[]) { return lines.reduce((sum, l) => { if (!Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > 20 || !Number.isInteger(l.price) || l.price < 0)
    throw Error('Invalid line'); return sum + l.quantity * l.price; }, 0); }
