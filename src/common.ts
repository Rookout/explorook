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

interface InputJavaLangServerConfig {
  jdkLocation: string;
}

interface LangServerConfigs {
  java?: JavaLangServerConfig;
  python?: PythonLangServerConfig;
}

interface InputLangServerConfigs {
  jdkLocation: string;
  pythonExecLocation: string;
}

interface LangServerInitParams {
  isGitRepo: boolean;
  gitURL?: string;
  gitCommit?: string;
  username?: string;
  password?: string;
}
