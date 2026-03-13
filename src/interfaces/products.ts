
export interface Product {
    productId: number;
    name: string; 
    description: string;
    price: number;
    state: string;
    stateId: number;
}

export interface ProductForm {
    name: string;
    description: string;
    price: number;
    stateId: number;
}  

export interface ProductFilters {
    name: string;
    description: string;
    price: number | null;
    state: number | null;
}

export type ResponseList = { results: Product[], total: number } | { message: string };
