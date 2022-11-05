
export class WithdrawRequest {
    amount: number;
    
    constructor(_amount: number) {
        this.amount = _amount;
    }
    
    static schema = new Map([[WithdrawRequest,
        {
            kind: 'struct',
            fields: [
                ['amount', 'u64'],
            ]
        }]]);
}

export class SwapStore {
    static schema = new Map([[SwapStore,
        {
            kind: 'struct',
            fields: [
                ['is_initialized', 'bool'],
                ['admin', [32]],
                ['amount_swapped', 'u64'],
                ['token_funded_account', [32]]]
        }]]);
}