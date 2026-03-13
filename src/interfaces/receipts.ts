
export interface Receipt {
    receiptId: number;
    prefix: string;
    receiptNumber: string;
    date: Date;
    customerId: number;
    customer: string;
    typePaymentId: number;
    typePayment: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    observation: string;
    stateId: number;
    state: string;
}

export interface ReceiptDetail {
    recDetId: number;
    productId: number;
    product: string;
    quantity: number;
    price: number;
    total: number;
}

export interface ReceiptForm {
    date: Date;
    customerId: number;
    typePaymentId: number;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    observation: string;
    stateId: number;
    details: ReceiptDetailForm[];
}

export interface ReceiptDetailForm {
    productId: number;
    quantity: number;
    price: number;
}

export interface ReceiptFilters {
    receiptNumber: string;
    customerId: number | null;
    typePaymentId: number | null;
    stateId: number | null;
    date: Date[] | null;
}

export interface ReceiptCountByStatus {
    quantity: number;
    name: string;
    id: number;
}

export type ResponseReceiptList = { results: Receipt[], total: number } | { message: string };
