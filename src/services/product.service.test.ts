import { getProductsList, getProductsById, createProduct } from './product.service';
import { ProductRepository } from '../repositories/product.repository';

jest.mock('../repositories/product.repository');

describe('Product Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getProductsList', () => {
        it('should fetch products and stocks, and return joined models', async () => {
            (ProductRepository.prototype.getAllProducts as jest.Mock).mockResolvedValue([
                { id: '1', title: 'A', description: '', price: 10 },
                { id: '2', title: 'B', description: '', price: 20 }
            ]);
            (ProductRepository.prototype.getAllStocks as jest.Mock).mockResolvedValue([
                { product_id: '1', count: 5 }
            ]);

            const result = await getProductsList();

            expect(result.length).toBe(2);
            expect(result[0].count).toBe(5);
            expect(result[1].count).toBe(0);

            expect(ProductRepository.prototype.getAllProducts).toHaveBeenCalledTimes(1);
            expect(ProductRepository.prototype.getAllStocks).toHaveBeenCalledTimes(1);
        });
    });

    describe('getProductsById', () => {
        it('should return undefined if product is not found', async () => {
            (ProductRepository.prototype.getProductById as jest.Mock).mockResolvedValue(undefined);

            const result = await getProductsById('invalid-id');

            expect(result).toBeUndefined();
            expect(ProductRepository.prototype.getStockByProductId).not.toHaveBeenCalled();
        });

        it('should return joined product if found', async () => {
            (ProductRepository.prototype.getProductById as jest.Mock).mockResolvedValue({
                id: '123', title: 'Found', description: '', price: 50
            });
            (ProductRepository.prototype.getStockByProductId as jest.Mock).mockResolvedValue({
                product_id: '123', count: 12
            });

            const result = await getProductsById('123');

            expect(result?.title).toBe('Found');
            expect(result?.count).toBe(12);
        });
    });

    describe('createProduct', () => {
        it('should generate a UUID, call repository, and return full model', async () => {
            const payload = { title: 'New Item', description: 'Desc', price: 99, count: 3 };
            (ProductRepository.prototype.createProductWithStock as jest.Mock).mockResolvedValue(undefined);

            const result = await createProduct(payload as any);

            expect(result.id).toBeDefined();
            expect(typeof result.id).toBe('string');
            expect(result.id.length).toBeGreaterThan(30);

            expect(result.title).toBe(payload.title);
            expect(result.price).toBe(payload.price);
            expect(result.count).toBe(payload.count);

            expect(ProductRepository.prototype.createProductWithStock).toHaveBeenCalledWith(
              expect.objectContaining({
                  id: expect.any(String),
                  title: 'New Item'
              }),
              3
            );
        });
    });
});