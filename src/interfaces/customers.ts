
export interface Customer {
    customerId: number;
    name: string;
    lastName: string;
    documentNumber: string;
    email: string;
    phone: string;
    cellPhone: string;
    address: string;
    state: string;
    stateId: number;
}

export interface CustomerForm {
    name: string;
    lastName: string;
    documentNumber: string;
    email: string;
    phone: string;
    cellPhone: string;
    address: string;
    stateId: number;
}  

export interface CustomerFilters {
    name: string;
    lastName: string;
    documentNumber: string;
    email: string;
    cellPhone: string;
    phone: string;
    address: string;
    state: number | null;
}

export type ResponseList = { results: Customer[], total: number } | { message: string };
