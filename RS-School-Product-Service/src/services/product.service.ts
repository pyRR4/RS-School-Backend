import crypto from 'crypto';
import { ProductRepository } from '../repositories/product.repository';
import { AvailableProduct } from '../types/product.types';
import { CreateProductPayload } from '../schemas/product.schema';

const repository = new ProductRepository();

export const getProductsList = async (): Promise<AvailableProduct[]> => {
  const products = await repository.getAllProducts();
  const stocks = await repository.getAllStocks();

  return products.map(product => {
    const stock = stocks.find(s => s.product_id === product.id);
    return {
      ...product,
      count: stock ? stock.count : 0
    };
  });
};

export const getProductsById = async (id: string): Promise<AvailableProduct | undefined> => {
  const product = await repository.getProductById(id);

  if (!product) {
    return undefined;
  }

  const stock = await repository.getStockByProductId(id);

  return {
    ...product,
    count: stock ? stock.count : 0
  };
};

export const createProduct = async (productData: CreateProductPayload): Promise<AvailableProduct> => {
  const newId = crypto.randomUUID();

  const newProduct = {
    id: newId,
    title: productData.title,
    description: productData.description || '',
    price: productData.price,
  };

  await repository.createProductWithStock(newProduct, productData.count);

  return {
    ...newProduct,
    count: productData.count
  };
};