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
