# RS School Shop App - Product Service

AWS Serverless backend application responsible for managing products and their inventory stock for the Shop App.

Built with **AWS CDK**, **TypeScript**, and **Node.js**, this service provisions the necessary cloud infrastructure (API Gateway, Lambda functions, DynamoDB tables) and exposes a RESTful API to interact with the catalog of products.

## 🚀 Tech Stack

* **Infrastructure as Code (IaC):** AWS CDK v2
* **Compute:** AWS Lambda (Node.js 20.x)
* **Database:** Amazon DynamoDB (NoSQL)
* **API Routing:** Amazon API Gateway
* **Language:** TypeScript
* **Validation:** Yup
* **Testing:** Jest

## 📋 Prerequisites

Before you begin, ensure you have the following installed and configured:
* [Node.js](https://nodejs.org/) (v20.x or later recommended)
* [AWS CLI](https://aws.amazon.com/cli/) configured with your AWS account credentials (`aws configure`)
* [AWS CDK CLI](https://docs.aws.amazon.com/cdk/v2/guide/cli.html) installed globally (`npm install -g aws-cdk`)

## 🛠️ Installation & Setup

1. Clone the repository and navigate to the project folder.
2. Install dependencies:
   ```bash
   npm install
3. Bootstrap your AWS environment (only required once per AWS account/region):
   ```bash
   npx cdk bootstrap

## 💻 Useful Commands

Here is the list of available commands to manage, test, and deploy the application:

| Command | Description |
|---|---|
| `npm run build` | Compiles TypeScript files to JavaScript |
| `npm run watch` | Watches for changes and compiles automatically |
| `npm run test` | Performs the Jest unit tests |
| `npm run deploy` | Builds the app and deploys the stack to your AWS account |
| `npm run destroy` | Destroys the deployed CloudFormation stack |
| `npm run db:populate` | Populates DynamoDB tables (`products` and `stocks`) with initial mock data |

## 🌐 API Reference

Once deployed, the API Gateway will provide a base URL (e.g., `https://<api-id>.execute-api.<region>.amazonaws.com/prod`).

### `GET /products`
Returns a complete list of products combined with their available inventory stock.
* **Response:** `200 OK`
* **Body:** Array of `AvailableProduct` objects.

### `GET /products/{id}`
Returns a single product by its UUID.
* **Response:** `200 OK` (if found), `404 Not Found` (if missing), or `400 Bad Request` (if ID is invalid).
* **Body:** A single `AvailableProduct` object.

### `POST /products`
Creates a new product and sets its initial stock amount using DynamoDB Transactions to ensure data consistency.
* **Request Body:** JSON containing `title`, `description`, `price`, and `count`.
* **Response:** `201 Created`
* **Body:** The newly created `AvailableProduct` object (including generated UUID).

## 🗄️ Database Structure

The service uses two separate DynamoDB tables:
1. **Products Table:** Stores primary product information (`id`, `title`, `description`, `price`).
2. **Stocks Table:** Stores inventory levels mapped to products (`product_id`, `count`).

The data is merged dynamically within the application's service layer before being returned to the client.