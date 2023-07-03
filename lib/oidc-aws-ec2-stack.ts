import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';

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
      thumbprints: ['6938fd4d98bab03faadb97b34396831e3780aea1'], // https://github.blog/changelog/2022-01-13-github-actions-update-on-oidc-based-deployments-to-aws/
    });

    // IAM Role for github actions
    const githubRole = new iam.Role(this, 'GitHubRole', {
      roleName: 'githubactions-ec2-codedeploy-role',
      assumedBy: new iam.OpenIdConnectPrincipal(githubProvider).withConditions(
        {
          "StringLike": {
            "token.actions.githubusercontent.com:sub": `${githubRepoPath}`
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

    // IAM Role for CodeDeploy
    const codedeployRole = new iam.Role(this, 'CodeDeployRole', {
      roleName: 'ec2-codedeploy-role',
      assumedBy: new iam.ServicePrincipal('codedeploy.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSCodeDeployRole'),
      ],
    });

    // CodeDeploy for EC2
    const ec2CodeDeploy = new codedeploy.ServerApplication(this, 'EC2CodeDeploy', {
      applicationName: 'ec2-codedeploy',
    });

    // CodeDeploy Deployment Group
    const deploymentGroup = new codedeploy.ServerDeploymentGroup(this, 'EC2DeploymentGroup', {
      application: ec2CodeDeploy,
      deploymentGroupName: 'ec2-codedeploy-deployment-group',
      role: codedeployRole,
      deploymentConfig: codedeploy.ServerDeploymentConfig.ALL_AT_ONCE,
      installAgent: true,
      ec2InstanceTags: new codedeploy.InstanceTagSet({
        'Name': ['S2'], // Name of your EC2 instance
      }),
    });
  }
}
