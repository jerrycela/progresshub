// GitLab API 相關類型定義

export interface GitLabInstanceConfig {
  id: string;
  name: string;
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  webhookSecret?: string;
  isActive: boolean;
}

export interface GitLabOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  createdAt: number;
}

export interface GitLabUser {
  id: number;
  username: string;
  name: string;
  email: string;
  avatarUrl: string;
  webUrl: string;
}

export interface GitLabCommit {
  id: string;
  shortId: string;
  title: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authoredDate: string;
  committerName: string;
  committerEmail: string;
  committedDate: string;
  webUrl: string;
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
}

export interface GitLabMergeRequest {
  id: number;
  iid: number;
  title: string;
  description: string;
  state: 'opened' | 'closed' | 'merged';
  sourceBranch: string;
  targetBranch: string;
  author: GitLabUser;
  createdAt: string;
  updatedAt: string;
  mergedAt?: string;
  closedAt?: string;
  webUrl: string;
}

export interface GitLabIssue {
  id: number;
  iid: number;
  title: string;
  description: string;
  state: 'opened' | 'closed';
  labels: string[];
  assignees: GitLabUser[];
  author: GitLabUser;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  webUrl: string;
  timeStats?: {
    timeEstimate: number;
    totalTimeSpent: number;
  };
}

// Webhook Event Types
export interface GitLabWebhookEvent {
  objectKind: 'push' | 'merge_request' | 'issue' | 'note';
  eventType?: string;
  project: {
    id: number;
    name: string;
    pathWithNamespace: string;
    webUrl: string;
  };
  user: {
    id: number;
    name: string;
    username: string;
    email: string;
  };
}

export interface GitLabPushEvent extends GitLabWebhookEvent {
  objectKind: 'push';
  ref: string;
  commits: Array<{
    id: string;
    message: string;
    timestamp: string;
    url: string;
    author: { name: string; email: string };
    added: string[];
    modified: string[];
    removed: string[];
  }>;
  totalCommitsCount: number;
}

export interface GitLabMergeRequestEvent extends GitLabWebhookEvent {
  objectKind: 'merge_request';
  objectAttributes: {
    id: number;
    iid: number;
    title: string;
    state: string;
    action: 'open' | 'close' | 'reopen' | 'update' | 'approved' | 'merge';
    sourceBranch: string;
    targetBranch: string;
  };
}

export interface GitLabIssueEvent extends GitLabWebhookEvent {
  objectKind: 'issue';
  objectAttributes: {
    id: number;
    iid: number;
    title: string;
    description: string;
    state: string;
    action: 'open' | 'close' | 'reopen' | 'update';
  };
}

// API Response Types
export interface ConnectionSettings {
  autoConvertTime: boolean;
  syncCommits: boolean;
  syncMRs: boolean;
  syncIssues: boolean;
}

export interface ActivitySummary {
  totalCommits: number;
  totalMRs: number;
  totalIssues: number;
  suggestedHours: number;
  convertedHours: number;
  periodStart: Date;
  periodEnd: Date;
}

// Request/Response DTOs
export interface CreateInstanceDto {
  name: string;
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  webhookSecret?: string;
}

export interface UpdateInstanceDto {
  name?: string;
  clientId?: string;
  clientSecret?: string;
  webhookSecret?: string;
  isActive?: boolean;
}

export interface UpdateConnectionSettingsDto {
  autoConvertTime?: boolean;
  syncCommits?: boolean;
  syncMRs?: boolean;
  syncIssues?: boolean;
}

export interface ConvertActivityDto {
  hours: number;
  categoryId: string;
  description?: string;
  taskId?: string;
}

export interface BatchConvertActivitiesDto {
  activityIds: string[];
  categoryId: string;
  useSuggestedHours: boolean;
}

export interface CreateIssueMappingDto {
  connectionId: string;
  gitlabIssueId: number;
  gitlabIssueIid: number;
  projectPath: string;
  taskId: string;
  syncDirection?: 'GITLAB_TO_TASK' | 'TASK_TO_GITLAB' | 'BIDIRECTIONAL';
}
