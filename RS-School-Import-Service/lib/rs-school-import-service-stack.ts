import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Notifications from 'aws-cdk-lib/aws-s3-notifications';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

export class RsSchoolImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const importBucket = this.createImportBucket();
    const api = this.createApiGateway();

    this.setupImportProductsFileLambda(importBucket, api);
    this.setupImportFileParserLambda(importBucket);
  }

  private createLambdaFunction(
    id: string,
    handlerPath: string,
    environment?: { [key: string]: string }
  ): lambdaNodejs.NodejsFunction {
    return new lambdaNodejs.NodejsFunction(this, id, {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, handlerPath),
      handler: 'handler',
      environment,
    });
  }

  private createImportBucket(): s3.Bucket {
    return new s3.Bucket(this, 'ImportBucket', {
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
  }

  private createApiGateway(): apigateway.RestApi {
    return new apigateway.RestApi(this, 'ImportApi', {
      restApiName: 'Import Service API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token'],
      },
    });
  }

  private setupImportProductsFileLambda(bucket: s3.Bucket, api: apigateway.RestApi): void {
    const importLambda = this.createLambdaFunction(
      'ImportProductsFileLambda',
      '../src/handlers/import-products-file.handler.ts',
      { IMPORT_BUCKET_NAME: bucket.bucketName }
    );

    bucket.grantPut(importLambda);

    const importResource = api.root.addResource('import');
    importResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(importLambda),
      {
        requestParameters: {
          'method.request.querystring.name': true,
        },
        requestValidatorOptions: {
          validateRequestParameters: true,
        },
      }
    );
  }

  private setupImportFileParserLambda(bucket: s3.Bucket): void {
    const parserLambda = this.createLambdaFunction(
      'ImportFileParserLambda',
      '../src/handlers/import-file-parser.handler.ts'
    );

    bucket.grantReadWrite(parserLambda);
    bucket.grantDelete(parserLambda);

    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3Notifications.LambdaDestination(parserLambda),
      { prefix: 'uploaded/' }
    );
  }
}