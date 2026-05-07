import {AvailableProduct} from "../types/product.types";

const mockDatabase: AvailableProduct[] = [
    {
        id: "7567ec4b-b10c-48c5-9345-fc73c48a80aa",
        title: "AWS Certified Developer Guide",
        description: "Complete guide to passing the AWS Dev exam.",
        price: 49.99,
        count: 15
    },
    {
        id: "7567ec4b-b10c-48c5-9345-fc73c48a80a1",
        title: "Serverless Framework Pro",
        description: "Advanced patterns for serverless applications.",
        price: 29.50,
        count: 2
    },
    {
        id: "7567ec4b-b10c-48c5-9345-fc73c48a80a2",
        title: "Mechanical Keyboard Keycaps",
        description: "PBT Double-shot keycaps, cherry profile.",
        price: 110.00,
        count: 0
    }
];

export const getProductsList = async (): Promise<AvailableProduct[]> => {
    return mockDatabase;
};

export const getProductsById = async (id: string): Promise<AvailableProduct | undefined> => {
    return mockDatabase.find(p => p.id === id);
};