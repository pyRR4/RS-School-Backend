#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { RsSchoolProductServiceStack } from '../lib/rs-school-product-service-stack';

const app = new cdk.App();
new RsSchoolProductServiceStack(app, 'RsSchoolProductServiceStack', {
});
