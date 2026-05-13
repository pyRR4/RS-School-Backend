import * as yup from 'yup';

export const CreateProductPayloadSchema = yup.object({
  title: yup.string().required('Title is required'),
  description: yup.string().default(''),
  price: yup.number().positive('Price must be positive').required('Price is required'),
  count: yup.number().integer().min(0, 'Count cannot be negative').required('Count is required'),
});

export type CreateProductPayload = yup.InferType<typeof CreateProductPayloadSchema>;