import * as yup from 'yup';

export interface Product {
    id: string;
    title: string;
    description: string;
    price: number;
}

export interface AvailableProduct extends Product {
    count: number;
}

export const CreateProductPayloadSchema = yup.object({
    title: yup.string().required('Title is required'),
    description: yup.string().default(''),
    price: yup.number().positive('Price must be positive').required('Price is required'),
    count: yup.number().integer().min(0, 'Count cannot be negative').required('Count is required'),
});