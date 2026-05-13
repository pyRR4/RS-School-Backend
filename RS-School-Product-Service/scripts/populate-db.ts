import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import * as fs from "fs";
import * as path from "path";

interface MockItem {
  id: string;
  title: string;
  description: string;
  price: number;
  count: number;
}

class DatabaseSeeder {
  private readonly docClient: DynamoDBDocumentClient;
  private readonly productsTable = "products";
  private readonly stocksTable = "stocks";

  constructor() {
    const client = new DynamoDBClient({ region: "eu-central-1" });
    this.docClient = DynamoDBDocumentClient.from(client);
  }

  public async populate(data: MockItem[]) {
    console.log(`Starting database population with ${data.length} items...`);

    try {
      for (const item of data) {
        await this.insertProduct(item);
        await this.insertStock(item);
      }
      console.log("Database populated successfully!");
    } catch (error) {
      console.error("Error populating database:", error);
    }
  }

  private async insertProduct(item: MockItem) {
    await this.docClient.send(new PutCommand({
      TableName: this.productsTable,
      Item: {
        id: item.id,
        title: item.title,
        description: item.description,
        price: item.price
      }
    }));
    console.log(`Product inserted: ${item.title}`);
  }

  private async insertStock(item: MockItem) {
    await this.docClient.send(new PutCommand({
      TableName: this.stocksTable,
      Item: {
        product_id: item.id, // Maps to the product's ID
        count: item.count
      }
    }));
    console.log(`Stock inserted for: ${item.title}`);
  }
}

const mockDataPath = path.join(__dirname, "mock-data.json");
const mockData: MockItem[] = JSON.parse(fs.readFileSync(mockDataPath, "utf-8"));

const seeder = new DatabaseSeeder();
seeder.populate(mockData);