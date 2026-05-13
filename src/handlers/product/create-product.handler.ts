import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createProduct } from '../../services/product.service';
import { withErrorHandler } from '../../utils/with-error-handler';
import { BadRequestError } from '../../errors/http.error';
import { CreateProductPayloadSchema } from '../../schemas/product.schema';

export const handler = withErrorHandler(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('POST /products requested. Body:', event.body);

  if (!event.body) {
    throw new BadRequestError('Product data is missing from the request body');
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(event.body);
  } catch {
    throw new BadRequestError('Invalid JSON format');
  }

  let validatedData;
  try {
    validatedData = await CreateProductPayloadSchema.validate(parsedBody, { stripUnknown: true });
  } catch (error: any) {
    throw new BadRequestError(`Validation error: ${error.message}`);
  }

  const createdProduct = await createProduct(validatedData);

  return {
    statusCode: 201,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(createdProduct),
  };
});