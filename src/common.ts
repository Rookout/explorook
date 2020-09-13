interface OperationStatus {
  isSuccess: boolean;
  reason?: string;
}

interface Settings {
  PerforceConnectionString?: string;
  PerforceTimeout?: number;
  PerforceUser?: string;
  BitbucketOnPremServers?: string[];
}

interface CanQueryRepoStatus {
  repoUrl: string;
  isSuccess: boolean;
  protocol: string;
  reason?: string;
}
