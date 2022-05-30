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

interface JavaLangServerConfig {
  jdkLocation: string;
  jdkMinimumVersionRequired?: string;
}

interface PythonLangServerConfig {
  pythonExecLocation: string;
  pythonMinimumMajorVersionRequired?: number;
  pythonMinimumMinorVersionRequired?: number;
}

interface GoLangServerConfig {
  goExecLocation: string;
  goMinimumMajorVersionRequired?: number;
  goMinimumMinorVersionRequired?: number;
}

interface InputJavaLangServerConfig {
  jdkLocation: string;
}

interface LangServerConfigs {
  java?: JavaLangServerConfig;
  python?: PythonLangServerConfig;
  go?: GoLangServerConfig;
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
