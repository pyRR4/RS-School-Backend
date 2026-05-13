import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, GetCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { Product } from "../types/product.types";

export class ProductRepository {
  private readonly docClient: DynamoDBDocumentClient;
  private readonly productsTable = process.env.PRODUCTS_TABLE_NAME || 'products';
  private readonly stocksTable = process.env.STOCKS_TABLE_NAME || 'stocks';

  constructor() {
    const client = new DynamoDBClient({});
    this.docClient = DynamoDBDocumentClient.from(client);
  }

  async getAllProducts(): Promise<Product[]> {
    const result = await this.docClient.send(new ScanCommand({ TableName: this.productsTable }));
    return (result.Items || []) as Product[];
  }

  async getAllStocks(): Promise<{ product_id: string, count: number }[]> {
    const result = await this.docClient.send(new ScanCommand({ TableName: this.stocksTable }));
    return (result.Items || []) as { product_id: string, count: number }[];
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const result = await this.docClient.send(new GetCommand({
      TableName: this.productsTable,
      Key: { id }
    }));
    return result.Item as Product | undefined;
  }

  async getStockByProductId(id: string): Promise<{ product_id: string, count: number } | undefined> {
    const result = await this.docClient.send(new GetCommand({
      TableName: this.stocksTable,
      Key: { product_id: id }
    }));
    return result.Item as { product_id: string, count: number } | undefined;
  }

  async createProductWithStock(product: Product, stockCount: number): Promise<void> {
    await this.docClient.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: this.productsTable,
            Item: product
          }
        },
        {
          Put: {
            TableName: this.stocksTable,
            Item: {
              product_id: product.id,
              count: stockCount
            }
          }
        }
      ]
    }));
  }
}