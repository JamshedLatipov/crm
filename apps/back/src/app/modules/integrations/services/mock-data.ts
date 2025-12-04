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
    ],
    // Mock данные для известного клиента
    customeroapi: [
        {
            CUSTOMER_NO: 12345,
            MUSTERI_ADI: 'Иван',
            MUSTERI_SOYADI: 'Иванов',
            BABA_ADI: 'Иванович',
            TELEFON: '+992900010203',
            DOGUM_TAR: '1990-01-15',
            CINSIYET_LP: 1,
            MEDENI_LP: 1,
            AYLIK_GELIR: 5000.00,
            AYLIQ_EMEK_HAQQI: 4500.00,
            IS_YERI: 'ООО Пример',
            addresses: [
                {
                    REGION: 'Душанбе',
                    DISTRICT: 'Центральный',
                    STREET: 'Рудаки',
                    HOUSE: '123',
                    APARTMENT: '45'
                }
            ],
            customerPhones: [
                {
                    CONTACT: 'Иван Иванов',
                    PHONE: '+992900010203',
                    TYPE: 'Мобильный'
                }
            ],
            identities: [
                {
                    BELGE_NO: 'A123456789',
                    VKIMLIK_TIP: 'Паспорт',
                    VADI: 'Иван',
                    VSOYADI: 'Иванов',
                    VBABA_ADI: 'Иванович'
                }
            ]
        }
    ],
    loanoapi: [
        {
            contractNo: 'LN100200300',
            contractAmount: 15000.00,
            beginDate: '2023-01-22',
            endDate: '2024-01-22',
            term: 12,
            interestRate: 28.0,
            loanStatusForBr: 'ACTIVE',
            customerNo: 145678,
            productName: 'Потребительский кредит',
            totalDebtAmount: 12000.50,
            nextPaymentDate: '2023-12-22',
            nextPaymentAmount: 1500.00,
            delayDaysCountInterest: 0,
            delayDaysCountPrincipal: 0
        },
        {
            contractNo: 'LN100200301',
            contractAmount: 25000.00,
            beginDate: '2022-06-15',
            endDate: '2024-06-15',
            term: 24,
            interestRate: 24.0,
            loanStatusForBr: 'ACTIVE',
            customerNo: 145678,
            productName: 'Ипотечный кредит',
            totalDebtAmount: 22000.75,
            nextPaymentDate: '2023-12-15',
            nextPaymentAmount: 1200.00,
            delayDaysCountInterest: 5,
            delayDaysCountPrincipal: 5
        }
    ],
    depositoapi: [
        {
            contractNo: 'DP-2025-000112',
            customerNo: 445566,
            contractAmount: 30000.00,
            productName: 'Time Deposit 12M',
            rate: 13.5,
            openDate: '2025-01-05',
            endDate: '2026-01-05',
            totalIntCalcAmount: 4050.00,
            ccyId: 972,
            status: 1,
            periodMonth: 12,
            totalIntPaidAmount: 2025.00
        }
    ],
    accountoapi: [
        {
            accountNo: '01-123456-1',
            iban: 'TJ970000000000000001234567890',
            customerNo: 123456,
            balance: 1200.50,
            ccyId: 972,
            productName: 'Current Account',
            isClosed: false,
            createdDate: '2020-01-15',
            creditTurnover: 50000.00,
            debetTurnover: 48500.00,
            todayTransactionsCount: 3,
            lastOperationDate: '2023-12-03'
        },
        {
            accountNo: '01-123456-2',
            iban: 'TJ970000000000000001234567891',
            customerNo: 123456,
            balance: 5000.00,
            ccyId: 840,
            productName: 'Savings Account',
            isClosed: false,
            createdDate: '2021-03-10',
            creditTurnover: 10000.00,
            debetTurnover: 5000.00,
            todayTransactionsCount: 1,
            lastOperationDate: '2023-12-01'
        }
    ],
    // Mock данные для неизвестного клиента (пустые массивы)
    customeroapi_empty: [],
    loanoapi_empty: {
        code: '-200',
        detail: 'ORA-20001: 2321 Phone number not found!\nORA-06512: at "ULOG.PLOG", line 906\nORA-06512: at "GAIA.GNI_MESSAGE", line 657\nORA-06512: at "GAIA.GNI_MESSAGE", line 689\nORA-06512: at "GAIA.ERRCATCH", line 3\nORA-06512: at "GAIA.OAPI_LOAN", line 3520\nORA-06512: at line 1\n',
        messages: [
            {
                message: null
            }
        ]
    },
    depositoapi_empty: [],
    accountoapi_empty: []
};

export function getMockDataByKey(key: string) {
    // Normalize key to lowercase to match mock keys
    const normalizedKey = key.toLowerCase();

    // Check if we should return empty data for unknown client
    const useEmptyData = process.env.UNKNOWN_CLIENT === 'true';
    const actualKey = useEmptyData ? `${normalizedKey}_empty` : normalizedKey;

    console.log(`getMockDataByKey: key="${key}", normalizedKey="${normalizedKey}", useEmptyData=${useEmptyData}, actualKey="${actualKey}"`);

    // Return specific mock data or a generic object if not found
    const data = MOCK_DATA[actualKey];
    if (data) {
        console.log(`Found mock data for ${actualKey}:`, Array.isArray(data) ? `Array with ${data.length} items` : 'Object');
        return data;
    } else {
        console.log(`No mock data found for ${actualKey}, available keys:`, Object.keys(MOCK_DATA));
        return { message: `Mock data for ${key}` };
    }
}
