#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { OIDCec2RoleStack } from '../lib/oidc-aws-ec2-stack';

const app = new cdk.App();
new OIDCec2RoleStack(app, 'OIDCec2RoleStack', {
  githubRepoPath: 'github.com/vishnus17/*',
  env: { account: process.env.ACCOUNT, region: process.env.REGION },
});