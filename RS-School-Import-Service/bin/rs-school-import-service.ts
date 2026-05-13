#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { RsSchoolImportServiceStack } from '../lib/rs-school-import-service-stack';

const app = new cdk.App();
new RsSchoolImportServiceStack(app, 'RsSchoolImportServiceStack', {});
