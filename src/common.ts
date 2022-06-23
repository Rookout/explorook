interface OperationStatus {
  isSuccess: boolean;
  reason?: string;
}

interface Settings {
  OverrideGlobal?: boolean;
  BitbucketOnPremServers?: string[];
}

interface CanQueryRepoStatus {
  repoUrl: string;
  isSuccess: boolean;
  protocol: string;
  reason?: string;
}

interface LangServerConfig {
  language: string;
  enabled: boolean;
  executableLocation?: string;
  minVersionRequired?: string;
  maxVersionRequired?: string;
}

interface EnableOrDisableSingleLanguageServer {
  language: string;
  enable: boolean;
}

interface InputLangServerConfigs {
  language: string;
  location: string;
}

interface LangServerInitParams {
  isGitRepo: boolean;
  gitURL?: string;
  gitCommit?: string;
  username?: string;
  password?: string;
}
