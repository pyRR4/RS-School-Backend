import {getProductsById, getProductsList} from './product.service';

describe('Product Service', () => {

    describe('getProductsList', () => {
        it('should return a complete list of mocked products', async () => {
            const products = await getProductsList();

            expect(products).toBeDefined();
            expect(Array.isArray(products)).toBe(true);
            expect(products.length).toBe(3);

            expect(products[0]).toHaveProperty('id');
            expect(products[0]).toHaveProperty('title');
            expect(products[0]).toHaveProperty('description');
            expect(products[0]).toHaveProperty('price');
            expect(products[0]).toHaveProperty('count');
        });
    });

    describe('getProductsById', () => {
        it('should return a specific product when a valid ID is provided', async () => {
            const validId = "7567ec4b-b10c-48c5-9345-fc73c48a80a1";

            const product = await getProductsById(validId);

            expect(product).toBeDefined();
            expect(product?.id).toBe(validId);
            expect(product?.title).toBe("Serverless Framework Pro");
            expect(product?.price).toBe(29.50);
            expect(product?.count).toBeDefined();
        });

        it('should return undefined when an ID that does not exist is provided', async () => {
            const invalidId = "non-existent-uuid-1234";

            const product = await getProductsById(invalidId);

            expect(product).toBeUndefined();
        });
    });
});