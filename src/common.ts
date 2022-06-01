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
  executableLocation: string;
  minVersionRequired?: string;
  maxVersionRequired?: string;
}

interface LangServerConfigs {
  java?: LangServerConfig;
  python?: LangServerConfig;
  go?: LangServerConfig;
}

interface EnabledLanguageServers {
  java: boolean;
  python: boolean;
  go: boolean;
  javascript: boolean;
  typescript: boolean;
}

interface InputLangServerConfigs {
  jdkLocation: string;
  pythonExecLocation: string;
  goExecLocation: string;
}

interface InputEnabledLanguageServers {
  java: boolean;
  python: boolean;
  go: boolean;
  javascript: boolean;
  typescript: boolean;
}

interface LangServerInitParams {
  isGitRepo: boolean;
  gitURL?: string;
  gitCommit?: string;
  username?: string;
  password?: string;
}
