export interface OperationStatus {
  isSuccess: boolean;
  reason?: string;
}

export interface Settings {
  OverrideGlobal?: boolean;
  BitbucketOnPremServers?: string[];
}

export interface CanQueryRepoStatus {
  repoUrl: string;
  isSuccess: boolean;
  protocol: string;
  reason?: string;
}

export enum SupportedServerLanguage {
  java = "java",
  python = "python",
  go = "go",
  typescript = "typescript"
}

export interface LangServerConfig {
  language: SupportedServerLanguage;
  enabled: boolean;
  executableLocation?: string;
  minVersionRequired?: string;
  maxVersionRequired?: string;
}

export interface EnableOrDisableSingleLanguageServer {
  language: SupportedServerLanguage;
  enable: boolean;
}

export interface InputLangServerConfigs {
  language: SupportedServerLanguage;
  location: string;
}

export interface LangServerInitParams {
  isGitRepo: boolean;
  gitURL?: string;
  gitCommit?: string;
  username?: string;
  password?: string;
}
