export interface AccountNode {
  id: string;
  code: string;
  name: string;
  parentCode?: string;
  level: number;
  type: 'debit' | 'credit';
  category: 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses';
  currency: string;
  isActive: boolean;
  children?: AccountNode[];
}

// Chart of Accounts Data - can be loaded from backend later
export const chartOfAccountsData: AccountNode[] = [
  {
    id: '1',
    code: '1',
    name: 'الأصول',
    level: 1,
    type: 'debit',
    category: 'assets',
    currency: 'YER',
    isActive: true,
    children: [
      {
        id: '11',
        code: '11',
        name: 'الأصول المتداولة',
        parentCode: '1',
        level: 2,
        type: 'debit',
        category: 'assets',
        currency: 'YER',
        isActive: true,
        children: [
          {
            id: '1101',
            code: '1101',
            name: 'النقدية بالصناديق',
            parentCode: '11',
            level: 3,
            type: 'debit',
            category: 'assets',
            currency: 'YER',
            isActive: true,
            children: [
              {
                id: '1101001',
                code: '1101001',
                name: 'صندوق الريال اليمني',
                parentCode: '1101',
                level: 4,
                type: 'debit',
                category: 'assets',
                currency: 'YER',
                isActive: true,
              },
              {
                id: '1101002',
                code: '1101002',
                name: 'صندوق المبيعات الرئيسي',
                parentCode: '1101',
                level: 4,
                type: 'debit',
                category: 'assets',
                currency: 'YER',
                isActive: true,
              },
              {
                id: '1101003',
                code: '1101003',
                name: 'صندوق الريال السعودي',
                parentCode: '1101',
                level: 4,
                type: 'debit',
                category: 'assets',
                currency: 'SAR',
                isActive: true,
              },
            ],
          },
          {
            id: '1102',
            code: '1102',
            name: 'النقدية بالبنوك',
            parentCode: '11',
            level: 3,
            type: 'debit',
            category: 'assets',
            currency: 'YER',
            isActive: true,
          },
        ],
      },
      {
        id: '14',
        code: '14',
        name: 'الأصول الثابتة',
        parentCode: '1',
        level: 2,
        type: 'debit',
        category: 'assets',
        currency: 'YER',
        isActive: true,
        children: [
          {
            id: '1401',
            code: '1401',
            name: 'السيارات ووسائل النقل',
            parentCode: '14',
            level: 3,
            type: 'debit',
            category: 'assets',
            currency: 'YER',
            isActive: true,
          },
          {
            id: '1402',
            code: '1402',
            name: 'الأجهزة والمعدات',
            parentCode: '14',
            level: 3,
            type: 'debit',
            category: 'assets',
            currency: 'YER',
            isActive: true,
          },
        ],
      },
    ],
  },
  {
    id: '2',
    code: '2',
    name: 'الخصوم وحقوق الملكية',
    level: 1,
    type: 'credit',
    category: 'liabilities',
    currency: 'YER',
    isActive: true,
  },
  {
    id: '3',
    code: '3',
    name: 'النفقات',
    level: 1,
    type: 'debit',
    category: 'expenses',
    currency: 'YER',
    isActive: true,
  },
  {
    id: '4',
    code: '4',
    name: 'الإيرادات',
    level: 1,
    type: 'credit',
    category: 'revenue',
    currency: 'YER',
    isActive: true,
  },
];
