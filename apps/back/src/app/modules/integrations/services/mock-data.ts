export const MOCK_DATA = {
    customer: {
        id: '12345',
        fullName: 'Ivanov Ivan Ivanovich',
        phoneNumber: '+79991234567',
        email: 'ivanov@example.com',
        clientSince: '2020-01-15',
        segment: 'VIP',
        manager: 'Petrov P.P.'
    },
    accounts: [
        { id: 'acc_1', type: 'Current', number: '40817810000000001234', currency: 'RUB', balance: 150000.50, status: 'Active' },
        { id: 'acc_2', type: 'Savings', number: '40817840000000005678', currency: 'USD', balance: 2500.00, status: 'Active' }
    ],
    loans: [
        { id: 'ln_1', product: 'Mortgage', amount: 5000000, remaining: 4200000, nextPayment: '2023-12-25', paymentAmount: 35000, status: 'Active' },
        { id: 'ln_2', product: 'Consumer Loan', amount: 500000, remaining: 0, nextPayment: '-', paymentAmount: 0, status: 'Closed' }
    ],
    deposits: [
        { id: 'dep_1', name: 'Profitable', amount: 1000000, rate: 8.5, endDate: '2024-05-20', status: 'Active' }
    ],
    cards: [
        { id: 'card_1', number: '**** 1234', type: 'Visa Platinum', expiry: '12/25', status: 'Active' },
        { id: 'card_2', number: '**** 5678', type: 'Mir Premium', expiry: '09/26', status: 'Active' }
    ]
};

export function getMockDataByKey(key: string) {
    // Normalize key to lowercase to match mock keys
    const normalizedKey = key.toLowerCase();
    
    // Return specific mock data or a generic object if not found
    return MOCK_DATA[normalizedKey] || { message: `Mock data for ${key}` };
}
