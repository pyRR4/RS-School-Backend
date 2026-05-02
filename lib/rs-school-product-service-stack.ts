import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { RestApi, Cors, LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { join } from 'path';

interface RouteDefinition {
  path: string;
  method: string;
  handler: NodejsFunction;
}

export class RsSchoolProductServiceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const api = this.createApiGateway();

    const getProductsListLambda = this.createLambda('GetProductsListLambda', 'get-products-list.handler.ts');
    const getProductByIdLambda = this.createLambda('GetProductsByIdLambda', 'get-products-by-id.handler.ts');

    this.configureRoutes(api, [
      { path: '/products', method: 'GET', handler: getProductsListLambda },
      { path: '/products/{productId}', method: 'GET', handler: getProductByIdLambda },
    ]);

    new CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'Product Service API URL',
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

  private createLambda(id: string, fileName: string): NodejsFunction {
    return new NodejsFunction(this, id, {
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: join(__dirname, `../src/handlers/product/${fileName}`),
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