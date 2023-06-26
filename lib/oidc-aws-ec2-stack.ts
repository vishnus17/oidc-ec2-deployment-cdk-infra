import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface OIDCec2RoleStackProps extends cdk.StackProps {
  readonly githubRepoPath: string;
}

export class OIDCec2RoleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: OIDCec2RoleStackProps) {
    super(scope, id, props);
    const githubRepoPath = props.githubRepoPath;

    // GitHub IdP provider
    const githubProvider = new iam.OpenIdConnectProvider(this, 'GitHubProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    // IAM Role for github actions
    const githubRole = new iam.Role(this, 'GitHubRole', {
      roleName: 'githubactions-ec2-codedeploy-role',
      assumedBy: new iam.OpenIdConnectPrincipal(githubProvider).withConditions(
        {
          "StringLike": {
            "token.actions.githubusercontent.com:sub": `repo:${githubRepoPath}`
          },
          "StringEquals": {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
          }
        }
      )
    });

    // IAM Policy for github actions
    githubRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'codedeploy:CreateDeployment',
        'codedeploy:GetApplication',
        'codedeploy:GetApplicationRevision',
        'codedeploy:GetDeployment',
        'codedeploy:GetDeploymentConfig',
        'codedeploy:RegisterApplicationRevision',
      ],
      resources: ['*'],
    }));
  }
}
