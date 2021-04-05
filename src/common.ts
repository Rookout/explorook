interface OperationStatus {
  isSuccess: boolean;
  reason?: string;
}

interface Settings {
  PerforceConnectionString?: string;
  PerforceTimeout?: string;
  PerforceUser?: string;
  OverrideGlobal?: boolean;
  BitbucketOnPremServers?: string[];
}

interface CanQueryRepoStatus {
  repoUrl: string;
  isSuccess: boolean;
  protocol: string;
  reason?: string;
}

interface JavaLangServerConfig {
  jdkLocation: string
  jdkMinimumVersionRequired?: string
}

interface LangServerInitParams {
  isGitRepo: boolean;
  gitURL?: string;
  gitCommit?: string;
  username?: string;
  password?: string;
}