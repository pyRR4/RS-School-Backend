import {Stack, StackProps, CfnOutput, RemovalPolicy} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {RestApi, Cors, LambdaIntegration} from 'aws-cdk-lib/aws-apigateway';
import {NodejsFunction} from 'aws-cdk-lib/aws-lambda-nodejs';
import {Runtime} from 'aws-cdk-lib/aws-lambda';
import {join} from 'path';
import {AttributeType, BillingMode, ITable, Table} from "aws-cdk-lib/aws-dynamodb";

interface RouteDefinition {
  path: string;
  method: string;
  handler: NodejsFunction;
}

export class RsSchoolProductServiceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const productsTable = this.createTable('ProductsTable', 'products', 'id');
    const stocksTable = this.createTable('StocksTable', 'stocks', 'product_id');

    const tableEnvironment = {
      PRODUCTS_TABLE_NAME: productsTable.tableName,
      STOCKS_TABLE_NAME: stocksTable.tableName,
    };

    const getProductsListLambda = this.createLambda('GetProductsListLambda', 'get-products-list.handler.ts', tableEnvironment);
    const getProductByIdLambda = this.createLambda('GetProductsByIdLambda', 'get-products-by-id.handler.ts', tableEnvironment);
    const createProductLambda = this.createLambda('CreateProductLambda', 'create-product.handler.ts', tableEnvironment);

    productsTable.grantReadData(getProductsListLambda);
    stocksTable.grantReadData(getProductsListLambda);

    productsTable.grantReadData(getProductByIdLambda);
    stocksTable.grantReadData(getProductByIdLambda);

    productsTable.grantWriteData(createProductLambda);
    stocksTable.grantWriteData(createProductLambda);

    const api = this.createApiGateway();
    this.configureRoutes(api, [
      {path: '/products', method: 'GET', handler: getProductsListLambda},
      {path: '/products/{productId}', method: 'GET', handler: getProductByIdLambda},
      {path: '/products', method: 'POST', handler: createProductLambda},
    ]);

    new CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'Product Service API URL',
    });
  }

  private createTable(id: string, tableName: string, partitionKeyName: string): ITable {
    return new Table(this, id, {
      tableName: tableName,
      partitionKey: {
        name: partitionKeyName,
        type: AttributeType.STRING
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }

  private createApiGateway(): RestApi {
    return new RestApi(this, 'ProductsApi', {
      restApiName: 'Product Service API',
      description: 'Product Service API',
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: Cors.DEFAULT_HEADERS,
      },
    });
  }

  private createLambda(id: string, fileName: string, environment: { [key: string]: string }): NodejsFunction {
    return new NodejsFunction(this, id, {
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: join(__dirname, `../src/handlers/product/${fileName}`),
      environment: environment,
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['aws-sdk'],
      },
    });
  }

  private configureRoutes(api: RestApi, routes: RouteDefinition[]): void {
    routes.forEach(route => {
      const resource = api.root.resourceForPath(route.path);
      resource.addMethod(route.method, new LambdaIntegration(route.handler));
    });
  }
}