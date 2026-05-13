import { ProductRepository } from './product.repository';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';

jest.mock('@aws-sdk/lib-dynamodb', () => {
  return {
    DynamoDBDocumentClient: {
      from: jest.fn(),
    },
    ScanCommand: jest.fn(),
    GetCommand: jest.fn(),
    TransactWriteCommand: jest.fn(),
  };
});

describe('ProductRepository', () => {
  let repository: ProductRepository;
  let mockSend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSend = jest.fn();
    (DynamoDBDocumentClient.from as jest.Mock).mockReturnValue({
      send: mockSend
    });

    repository = new ProductRepository();
  });

  it('should return all products on getAllProducts()', async () => {
    const mockProducts = [{ id: '1', title: 'Product 1', price: 10 }];
    mockSend.mockResolvedValueOnce({ Items: mockProducts });

    const result = await repository.getAllProducts();

    expect(result).toEqual(mockProducts);
    expect(ScanCommand).toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('should return a specific product on getProductById()', async () => {
    const mockProduct = { id: '123', title: 'Product 123', price: 20 };
    mockSend.mockResolvedValueOnce({ Item: mockProduct });

    const result = await repository.getProductById('123');

    expect(result).toEqual(mockProduct);
    expect(GetCommand).toHaveBeenCalledWith(expect.objectContaining({
      TableName: expect.any(String),
      Key: { id: '123' }
    }));
  });

  it('should execute a transaction on createProductWithStock()', async () => {
    const product = { id: 'uuid-1', title: 'New', description: '', price: 100 };
    mockSend.mockResolvedValueOnce({}); // Transakcja nie zwraca danych, tylko status sukcesu

    await repository.createProductWithStock(product, 5);

    expect(TransactWriteCommand).toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalledTimes(1);
  });
});