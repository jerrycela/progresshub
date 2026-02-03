# GitLab 整合功能 - 後端實作工作清單

> 文件版本: 1.0
> 建立日期: 2026-02-02
> 負責團隊: 後端開發

---

## 目錄

1. [專案概述](#專案概述)
2. [任務一：Prisma Schema 更新](#任務一prisma-schema-更新)
3. [任務二：GitLab API 骨架建立](#任務二gitlab-api-骨架建立)
4. [驗收標準](#驗收標準)
5. [注意事項](#注意事項)

---

## 專案概述

### 目標
整合 GitLab 功能至 ProgressHub，實現：
- 多 GitLab 實例支援（公司內部 GitLab + gitlab.com）
- 員工帳號連結
- 自動同步開發活動（Commit、MR、Issue）
- 活動自動轉換為工時記錄
- Issue 雙向同步

### 技術棧
- **ORM**: Prisma
- **資料庫**: PostgreSQL
- **認證**: GitLab OAuth 2.0
- **Webhook**: GitLab System/Project Hooks

---

## 任務一：Prisma Schema 更新

### 1.1 新增 Enum 定義

在 `prisma/schema.prisma` 檔案中新增以下 enum：

```prisma
// GitLab 活動類型
enum GitLabActivityType {
  COMMIT          // Git 提交
  MR_OPENED       // MR 開啟
  MR_MERGED       // MR 合併
  MR_CLOSED       // MR 關閉
  MR_COMMENT      // MR 評論
  MR_APPROVED     // MR 核准
  ISSUE_CREATED   // Issue 建立
  ISSUE_CLOSED    // Issue 關閉
  ISSUE_UPDATED   // Issue 更新
}

// 同步方向
enum SyncDirection {
  GITLAB_TO_TASK   // GitLab -> ProgressHub
  TASK_TO_GITLAB   // ProgressHub -> GitLab
  BIDIRECTIONAL    // 雙向同步
}
```

### 1.2 新增 GitLabInstance Model

管理多個 GitLab 實例的配置。

```prisma
// GitLab 實例配置表
model GitLabInstance {
  id              String   @id @default(uuid())
  name            String                              // 顯示名稱，如 "公司 GitLab"
  baseUrl         String   @map("base_url")           // 實例 URL，如 "https://gitlab.company.com"
  clientId        String   @map("client_id")          // OAuth Application ID
  clientSecret    String   @map("client_secret")      // OAuth Secret（需加密儲存）
  webhookSecret   String?  @map("webhook_secret")     // Webhook 驗證密鑰
  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // Relations
  connections     GitLabConnection[]

  @@unique([baseUrl])
  @@map("gitlab_instances")
}
```

**欄位說明：**

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| name | String | 實例顯示名稱 |
| baseUrl | String | GitLab 實例 URL（唯一） |
| clientId | String | OAuth 應用程式 ID |
| clientSecret | String | OAuth 密鑰（建議加密儲存） |
| webhookSecret | String? | Webhook 簽章驗證密鑰 |
| isActive | Boolean | 是否啟用 |

### 1.3 新增 GitLabConnection Model

管理員工與 GitLab 帳號的連結。

```prisma
// GitLab 帳號連結表
model GitLabConnection {
  id              String    @id @default(uuid())
  employeeId      String    @map("employee_id")
  instanceId      String    @map("instance_id")
  gitlabUserId    Int       @map("gitlab_user_id")       // GitLab 使用者 ID
  gitlabUsername  String    @map("gitlab_username")      // GitLab 使用者名稱
  accessToken     String    @map("access_token")         // OAuth Access Token（需加密）
  refreshToken    String?   @map("refresh_token")        // OAuth Refresh Token（需加密）
  tokenExpiresAt  DateTime? @map("token_expires_at")     // Token 過期時間
  autoConvertTime Boolean   @default(false) @map("auto_convert_time") // 自動轉換工時
  syncCommits     Boolean   @default(true) @map("sync_commits")       // 同步 Commits
  syncMRs         Boolean   @default(true) @map("sync_mrs")           // 同步 MRs
  syncIssues      Boolean   @default(true) @map("sync_issues")        // 同步 Issues
  connectedAt     DateTime  @default(now()) @map("connected_at")
  lastSyncAt      DateTime? @map("last_sync_at")
  isActive        Boolean   @default(true) @map("is_active")

  // Relations
  employee        Employee         @relation(fields: [employeeId], references: [id])
  instance        GitLabInstance   @relation(fields: [instanceId], references: [id])
  activities      GitLabActivity[]
  issueMappings   GitLabIssueMapping[]

  @@unique([employeeId, instanceId])  // 每個員工每個實例只能有一個連結
  @@index([employeeId])
  @@index([instanceId])
  @@map("gitlab_connections")
}
```

**欄位說明：**

| 欄位 | 類型 | 說明 |
|------|------|------|
| employeeId | UUID | 關聯的員工 ID |
| instanceId | UUID | 關聯的 GitLab 實例 ID |
| gitlabUserId | Int | GitLab 使用者 ID |
| gitlabUsername | String | GitLab 使用者名稱 |
| accessToken | String | OAuth Access Token |
| refreshToken | String? | OAuth Refresh Token |
| tokenExpiresAt | DateTime? | Token 過期時間 |
| autoConvertTime | Boolean | 是否自動將活動轉換為工時 |
| syncCommits | Boolean | 是否同步 Commits |
| syncMRs | Boolean | 是否同步 MRs |
| syncIssues | Boolean | 是否同步 Issues |
| lastSyncAt | DateTime? | 最後同步時間 |

### 1.4 新增 GitLabActivity Model

記錄從 GitLab 同步的開發活動。

```prisma
// GitLab 活動記錄表
model GitLabActivity {
  id              String             @id @default(uuid())
  connectionId    String             @map("connection_id")
  activityType    GitLabActivityType @map("activity_type")
  gitlabEventId   String             @unique @map("gitlab_event_id") // GitLab 事件唯一 ID
  projectPath     String             @map("project_path")            // 專案路徑 "group/project"

  // Commit 相關欄位
  commitSha       String?            @map("commit_sha")
  commitMessage   String?            @map("commit_message") @db.Text
  additions       Int?               @default(0)                      // 新增行數
  deletions       Int?               @default(0)                      // 刪除行數

  // MR 相關欄位
  mrIid           Int?               @map("mr_iid")                   // MR 編號
  mrTitle         String?            @map("mr_title")
  mrState         String?            @map("mr_state")                 // opened/merged/closed

  // Issue 相關欄位
  issueIid        Int?               @map("issue_iid")
  issueTitle      String?            @map("issue_title")

  activityAt      DateTime           @map("activity_at")              // 活動發生時間

  // 關聯到 ProgressHub
  taskId          String?            @map("task_id")                  // 關聯的任務
  timeEntryId     String?            @map("time_entry_id")            // 轉換後的工時記錄
  suggestedHours  Decimal?           @db.Decimal(4, 2) @map("suggested_hours") // 建議工時

  createdAt       DateTime           @default(now()) @map("created_at")

  // Relations
  connection      GitLabConnection   @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  task            Task?              @relation(fields: [taskId], references: [id], onDelete: SetNull)
  timeEntry       TimeEntry?         @relation(fields: [timeEntryId], references: [id], onDelete: SetNull)

  @@index([connectionId, activityAt])
  @@index([taskId])
  @@index([projectPath])
  @@map("gitlab_activities")
}
```

**工時計算規則（suggestedHours）：**

| 活動類型 | 計算公式 |
|----------|----------|
| COMMIT | `min(0.25 + (additions + deletions) / 100, 2.0)` |
| MR_OPENED | `0.5` |
| MR_MERGED | `0.25` |
| MR_COMMENT | `0.25` |
| MR_APPROVED | `0.25` |

### 1.5 新增 GitLabIssueMapping Model

管理 GitLab Issue 與 ProgressHub Task 的對應關係。

```prisma
// GitLab Issue 對應表
model GitLabIssueMapping {
  id              String        @id @default(uuid())
  connectionId    String        @map("connection_id")
  gitlabIssueId   Int           @map("gitlab_issue_id")      // GitLab Issue ID
  gitlabIssueIid  Int           @map("gitlab_issue_iid")     // GitLab Issue 編號
  projectPath     String        @map("project_path")
  issueUrl        String        @map("issue_url")            // Issue 完整 URL
  taskId          String        @unique @map("task_id")      // 對應的任務 ID
  syncDirection   SyncDirection @default(BIDIRECTIONAL) @map("sync_direction")
  lastSyncAt      DateTime?     @map("last_sync_at")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  // Relations
  connection      GitLabConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  task            Task             @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@unique([connectionId, gitlabIssueId])
  @@index([taskId])
  @@map("gitlab_issue_mappings")
}
```

### 1.6 更新現有 Model 的 Relations

#### 更新 Employee Model

```prisma
model Employee {
  // ... 現有欄位保持不變 ...

  // 新增 Relations
  gitlabConnections GitLabConnection[]
}
```

#### 更新 Task Model

```prisma
model Task {
  // ... 現有欄位保持不變 ...

  // 新增 Relations
  gitlabActivities   GitLabActivity[]
  gitlabIssueMapping GitLabIssueMapping?
}
```

#### 更新 TimeEntry Model

```prisma
model TimeEntry {
  // ... 現有欄位保持不變 ...

  // 新增 Relations
  gitlabActivity GitLabActivity?
}
```

### 1.7 Migration 執行步驟

```bash
# 1. 建立 migration
npx prisma migrate dev --name add_gitlab_integration

# 2. 產生 Prisma Client
npx prisma generate

# 3. 驗證 schema
npx prisma validate
```

### 1.8 完整 Schema 變更檢查清單

- [ ] 新增 `GitLabActivityType` enum
- [ ] 新增 `SyncDirection` enum
- [ ] 新增 `GitLabInstance` model
- [ ] 新增 `GitLabConnection` model
- [ ] 新增 `GitLabActivity` model
- [ ] 新增 `GitLabIssueMapping` model
- [ ] 更新 `Employee` model 新增 gitlabConnections relation
- [ ] 更新 `Task` model 新增 gitlabActivities 和 gitlabIssueMapping relations
- [ ] 更新 `TimeEntry` model 新增 gitlabActivity relation
- [ ] 執行 `prisma migrate dev`
- [ ] 執行 `prisma generate`
- [ ] 所有現有測試通過

---

## 任務二：GitLab API 骨架建立

### 2.1 目錄結構

```
backend/src/
├── routes/
│   └── gitlab/
│       ├── index.ts           # 路由聚合
│       ├── instances.ts       # 實例管理 (Admin)
│       ├── connections.ts     # 帳號連結
│       ├── activities.ts      # 活動查詢
│       ├── issues.ts          # Issue 同步
│       └── webhook.ts         # Webhook 處理
├── services/
│   └── gitlab/
│       ├── index.ts           # Service 聚合
│       ├── instanceService.ts # 實例管理
│       ├── oauthService.ts    # OAuth 流程
│       ├── activityService.ts # 活動同步
│       ├── issueService.ts    # Issue 同步
│       └── timeConvertService.ts # 工時轉換
├── utils/
│   └── gitlab/
│       ├── apiClient.ts       # GitLab API Client
│       └── webhookVerifier.ts # Webhook 簽章驗證
└── types/
    └── gitlab.ts              # TypeScript 類型定義
```

### 2.2 TypeScript 類型定義

建立 `backend/src/types/gitlab.ts`：

```typescript
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
```

### 2.3 GitLab API Client

建立 `backend/src/utils/gitlab/apiClient.ts`：

```typescript
import axios, { AxiosInstance } from 'axios';
import { GitLabUser, GitLabCommit, GitLabMergeRequest, GitLabIssue } from '../../types/gitlab';

export class GitLabApiClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string, accessToken: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.client = axios.create({
      baseURL: `${this.baseUrl}/api/v4`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // 取得當前使用者資訊
  async getCurrentUser(): Promise<GitLabUser> {
    const response = await this.client.get('/user');
    return this.transformUser(response.data);
  }

  // 取得使用者的 Commits
  async getUserCommits(projectPath: string, since?: Date): Promise<GitLabCommit[]> {
    const params: any = { all: true };
    if (since) {
      params.since = since.toISOString();
    }

    const encodedPath = encodeURIComponent(projectPath);
    const response = await this.client.get(`/projects/${encodedPath}/repository/commits`, { params });
    return response.data.map(this.transformCommit);
  }

  // 取得使用者的 MRs
  async getUserMergeRequests(state?: 'opened' | 'merged' | 'closed' | 'all'): Promise<GitLabMergeRequest[]> {
    const response = await this.client.get('/merge_requests', {
      params: { state: state || 'all', scope: 'all' },
    });
    return response.data.map(this.transformMergeRequest);
  }

  // 取得使用者的 Issues
  async getUserIssues(state?: 'opened' | 'closed' | 'all'): Promise<GitLabIssue[]> {
    const response = await this.client.get('/issues', {
      params: { state: state || 'all', scope: 'all' },
    });
    return response.data.map(this.transformIssue);
  }

  // 取得專案列表
  async getProjects(membership: boolean = true): Promise<any[]> {
    const response = await this.client.get('/projects', {
      params: { membership, per_page: 100 },
    });
    return response.data;
  }

  // 建立 Issue
  async createIssue(projectPath: string, title: string, description?: string): Promise<GitLabIssue> {
    const encodedPath = encodeURIComponent(projectPath);
    const response = await this.client.post(`/projects/${encodedPath}/issues`, {
      title,
      description,
    });
    return this.transformIssue(response.data);
  }

  // 更新 Issue
  async updateIssue(projectPath: string, issueIid: number, updates: Partial<GitLabIssue>): Promise<GitLabIssue> {
    const encodedPath = encodeURIComponent(projectPath);
    const response = await this.client.put(`/projects/${encodedPath}/issues/${issueIid}`, updates);
    return this.transformIssue(response.data);
  }

  // Transform helpers
  private transformUser(data: any): GitLabUser {
    return {
      id: data.id,
      username: data.username,
      name: data.name,
      email: data.email,
      avatarUrl: data.avatar_url,
      webUrl: data.web_url,
    };
  }

  private transformCommit(data: any): GitLabCommit {
    return {
      id: data.id,
      shortId: data.short_id,
      title: data.title,
      message: data.message,
      authorName: data.author_name,
      authorEmail: data.author_email,
      authoredDate: data.authored_date,
      committerName: data.committer_name,
      committerEmail: data.committer_email,
      committedDate: data.committed_date,
      webUrl: data.web_url,
      stats: data.stats,
    };
  }

  private transformMergeRequest(data: any): GitLabMergeRequest {
    return {
      id: data.id,
      iid: data.iid,
      title: data.title,
      description: data.description,
      state: data.state,
      sourceBranch: data.source_branch,
      targetBranch: data.target_branch,
      author: {
        id: data.author.id,
        username: data.author.username,
        name: data.author.name,
        email: data.author.email || '',
        avatarUrl: data.author.avatar_url,
        webUrl: data.author.web_url,
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      mergedAt: data.merged_at,
      closedAt: data.closed_at,
      webUrl: data.web_url,
    };
  }

  private transformIssue(data: any): GitLabIssue {
    return {
      id: data.id,
      iid: data.iid,
      title: data.title,
      description: data.description,
      state: data.state,
      labels: data.labels,
      assignees: data.assignees?.map(this.transformUser) || [],
      author: this.transformUser(data.author),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      closedAt: data.closed_at,
      webUrl: data.web_url,
      timeStats: data.time_stats,
    };
  }
}
```

### 2.4 API 路由定義

#### 2.4.1 實例管理路由 (Admin Only)

建立 `backend/src/routes/gitlab/instances.ts`：

```typescript
import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';

const router = Router();

/**
 * @route   GET /api/gitlab/instances
 * @desc    取得所有 GitLab 實例列表
 * @access  Admin
 */
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  // TODO: 實作
  res.json({ message: 'List all GitLab instances' });
});

/**
 * @route   POST /api/gitlab/instances
 * @desc    新增 GitLab 實例
 * @access  Admin
 * @body    { name, baseUrl, clientId, clientSecret, webhookSecret? }
 */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  // TODO: 實作
  // 驗證 baseUrl 格式
  // 驗證 OAuth 憑證是否有效（嘗試取得 access token）
  // 儲存到資料庫（clientSecret 需加密）
  res.json({ message: 'Create GitLab instance' });
});

/**
 * @route   PUT /api/gitlab/instances/:id
 * @desc    更新 GitLab 實例
 * @access  Admin
 */
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  // TODO: 實作
  res.json({ message: 'Update GitLab instance' });
});

/**
 * @route   DELETE /api/gitlab/instances/:id
 * @desc    刪除 GitLab 實例
 * @access  Admin
 */
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  // TODO: 實作
  // 檢查是否有員工連結，若有則需先斷開
  res.json({ message: 'Delete GitLab instance' });
});

/**
 * @route   POST /api/gitlab/instances/:id/test
 * @desc    測試 GitLab 實例連線
 * @access  Admin
 */
router.post('/:id/test', requireAuth, requireAdmin, async (req, res) => {
  // TODO: 實作
  res.json({ message: 'Test GitLab instance connection' });
});

export default router;
```

#### 2.4.2 帳號連結路由

建立 `backend/src/routes/gitlab/connections.ts`：

```typescript
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';

const router = Router();

/**
 * @route   GET /api/gitlab/connections
 * @desc    取得當前使用者的 GitLab 連結
 * @access  Authenticated
 */
router.get('/', requireAuth, async (req, res) => {
  // TODO: 實作
  res.json({ message: 'List user GitLab connections' });
});

/**
 * @route   GET /api/gitlab/connections/available-instances
 * @desc    取得可連結的 GitLab 實例列表
 * @access  Authenticated
 */
router.get('/available-instances', requireAuth, async (req, res) => {
  // TODO: 實作
  // 回傳使用者尚未連結的活躍實例
  res.json({ message: 'List available GitLab instances' });
});

/**
 * @route   GET /api/gitlab/connections/oauth/:instanceId
 * @desc    取得 OAuth 授權 URL
 * @access  Authenticated
 */
router.get('/oauth/:instanceId', requireAuth, async (req, res) => {
  // TODO: 實作
  // 產生 state token（防 CSRF）
  // 建構 OAuth 授權 URL
  // 回傳 { authUrl, state }
  res.json({ message: 'Get OAuth authorization URL' });
});

/**
 * @route   GET /api/gitlab/connections/oauth/callback
 * @desc    OAuth 回調處理
 * @access  Public (OAuth redirect)
 */
router.get('/oauth/callback', async (req, res) => {
  // TODO: 實作
  // 驗證 state token
  // 用 code 換取 access token
  // 取得 GitLab 使用者資訊
  // 建立 GitLabConnection 記錄
  // 重導向到前端成功頁面
  res.json({ message: 'OAuth callback' });
});

/**
 * @route   PUT /api/gitlab/connections/:id/settings
 * @desc    更新連結設定
 * @access  Authenticated (Owner)
 * @body    { autoConvertTime, syncCommits, syncMRs, syncIssues }
 */
router.put('/:id/settings', requireAuth, async (req, res) => {
  // TODO: 實作
  res.json({ message: 'Update connection settings' });
});

/**
 * @route   DELETE /api/gitlab/connections/:id
 * @desc    斷開 GitLab 連結
 * @access  Authenticated (Owner)
 */
router.delete('/:id', requireAuth, async (req, res) => {
  // TODO: 實作
  // 撤銷 OAuth token
  // 刪除 connection 記錄
  // 相關活動記錄保留（歷史紀錄）
  res.json({ message: 'Disconnect GitLab' });
});

/**
 * @route   POST /api/gitlab/connections/:id/sync
 * @desc    手動觸發同步
 * @access  Authenticated (Owner)
 */
router.post('/:id/sync', requireAuth, async (req, res) => {
  // TODO: 實作
  // 同步最近 7 天的活動
  res.json({ message: 'Trigger manual sync' });
});

export default router;
```

#### 2.4.3 活動查詢路由

建立 `backend/src/routes/gitlab/activities.ts`：

```typescript
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';

const router = Router();

/**
 * @route   GET /api/gitlab/activities
 * @desc    取得 GitLab 活動列表
 * @access  Authenticated
 * @query   { startDate, endDate, type?, projectPath?, converted? }
 */
router.get('/', requireAuth, async (req, res) => {
  // TODO: 實作
  // 支援分頁
  // 支援篩選條件
  res.json({ message: 'List GitLab activities' });
});

/**
 * @route   GET /api/gitlab/activities/summary
 * @desc    取得活動統計摘要
 * @access  Authenticated
 * @query   { startDate, endDate }
 */
router.get('/summary', requireAuth, async (req, res) => {
  // TODO: 實作
  // 回傳 { totalCommits, totalMRs, totalIssues, suggestedHours, convertedHours }
  res.json({ message: 'Get activities summary' });
});

/**
 * @route   GET /api/gitlab/activities/:id
 * @desc    取得單一活動詳情
 * @access  Authenticated
 */
router.get('/:id', requireAuth, async (req, res) => {
  // TODO: 實作
  res.json({ message: 'Get activity detail' });
});

/**
 * @route   POST /api/gitlab/activities/:id/convert
 * @desc    將活動轉換為工時記錄
 * @access  Authenticated
 * @body    { hours, categoryId, description?, taskId? }
 */
router.post('/:id/convert', requireAuth, async (req, res) => {
  // TODO: 實作
  // 建立 TimeEntry
  // 更新 GitLabActivity.timeEntryId
  res.json({ message: 'Convert activity to time entry' });
});

/**
 * @route   POST /api/gitlab/activities/batch-convert
 * @desc    批次轉換活動為工時記錄
 * @access  Authenticated
 * @body    { activityIds: string[], categoryId, useSuggestedHours: boolean }
 */
router.post('/batch-convert', requireAuth, async (req, res) => {
  // TODO: 實作
  res.json({ message: 'Batch convert activities' });
});

/**
 * @route   PUT /api/gitlab/activities/:id/link-task
 * @desc    將活動關聯到任務
 * @access  Authenticated
 * @body    { taskId }
 */
router.put('/:id/link-task', requireAuth, async (req, res) => {
  // TODO: 實作
  res.json({ message: 'Link activity to task' });
});

export default router;
```

#### 2.4.4 Issue 同步路由

建立 `backend/src/routes/gitlab/issues.ts`：

```typescript
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';

const router = Router();

/**
 * @route   GET /api/gitlab/issues/mappings
 * @desc    取得 Issue 對應列表
 * @access  Authenticated
 */
router.get('/mappings', requireAuth, async (req, res) => {
  // TODO: 實作
  res.json({ message: 'List issue mappings' });
});

/**
 * @route   POST /api/gitlab/issues/mappings
 * @desc    建立 Issue 與任務的對應
 * @access  Authenticated
 * @body    { connectionId, gitlabIssueId, gitlabIssueIid, projectPath, taskId, syncDirection }
 */
router.post('/mappings', requireAuth, async (req, res) => {
  // TODO: 實作
  res.json({ message: 'Create issue mapping' });
});

/**
 * @route   DELETE /api/gitlab/issues/mappings/:id
 * @desc    刪除 Issue 對應
 * @access  Authenticated
 */
router.delete('/mappings/:id', requireAuth, async (req, res) => {
  // TODO: 實作
  res.json({ message: 'Delete issue mapping' });
});

/**
 * @route   POST /api/gitlab/issues/sync-from-gitlab/:mappingId
 * @desc    從 GitLab 同步到任務
 * @access  Authenticated
 */
router.post('/sync-from-gitlab/:mappingId', requireAuth, async (req, res) => {
  // TODO: 實作
  // 更新任務狀態、名稱等
  res.json({ message: 'Sync from GitLab to task' });
});

/**
 * @route   POST /api/gitlab/issues/sync-to-gitlab/:mappingId
 * @desc    從任務同步到 GitLab
 * @access  Authenticated
 */
router.post('/sync-to-gitlab/:mappingId', requireAuth, async (req, res) => {
  // TODO: 實作
  // 更新 GitLab Issue
  res.json({ message: 'Sync from task to GitLab' });
});

/**
 * @route   GET /api/gitlab/issues/search
 * @desc    搜尋 GitLab Issues（用於建立對應）
 * @access  Authenticated
 * @query   { connectionId, query }
 */
router.get('/search', requireAuth, async (req, res) => {
  // TODO: 實作
  res.json({ message: 'Search GitLab issues' });
});

/**
 * @route   POST /api/gitlab/issues/create-from-task
 * @desc    從任務建立 GitLab Issue
 * @access  Authenticated
 * @body    { connectionId, projectPath, taskId }
 */
router.post('/create-from-task', requireAuth, async (req, res) => {
  // TODO: 實作
  // 在 GitLab 建立 Issue
  // 建立 mapping 記錄
  res.json({ message: 'Create GitLab issue from task' });
});

export default router;
```

#### 2.4.5 Webhook 處理路由

建立 `backend/src/routes/gitlab/webhook.ts`：

```typescript
import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

/**
 * @route   POST /api/gitlab/webhook/:instanceId
 * @desc    接收 GitLab Webhook 事件
 * @access  Public (驗證 X-Gitlab-Token)
 */
router.post('/:instanceId', async (req, res) => {
  const { instanceId } = req.params;
  const token = req.headers['x-gitlab-token'] as string;
  const eventType = req.headers['x-gitlab-event'] as string;

  // TODO: 實作
  // 1. 驗證 webhook secret
  // 2. 根據 event type 處理
  //    - Push Event: 記錄 commits
  //    - Merge Request Event: 記錄 MR 活動
  //    - Issue Event: 更新關聯任務

  console.log(`Received GitLab webhook: ${eventType} for instance ${instanceId}`);

  // 快速回應，避免 timeout
  res.status(200).json({ received: true });

  // 異步處理事件
  // processWebhookEvent(instanceId, eventType, req.body).catch(console.error);
});

export default router;
```

#### 2.4.6 路由聚合

建立 `backend/src/routes/gitlab/index.ts`：

```typescript
import { Router } from 'express';
import instanceRoutes from './instances';
import connectionRoutes from './connections';
import activityRoutes from './activities';
import issueRoutes from './issues';
import webhookRoutes from './webhook';

const router = Router();

router.use('/instances', instanceRoutes);
router.use('/connections', connectionRoutes);
router.use('/activities', activityRoutes);
router.use('/issues', issueRoutes);
router.use('/webhook', webhookRoutes);

export default router;
```

### 2.5 Service Layer 骨架

#### 2.5.1 OAuth Service

建立 `backend/src/services/gitlab/oauthService.ts`：

```typescript
import { GitLabInstance } from '@prisma/client';
import { GitLabOAuthTokens } from '../../types/gitlab';

export class GitLabOAuthService {
  /**
   * 產生 OAuth 授權 URL
   */
  async generateAuthUrl(instance: GitLabInstance, state: string): Promise<string> {
    // TODO: 實作
    const params = new URLSearchParams({
      client_id: instance.clientId,
      redirect_uri: `${process.env.API_BASE_URL}/api/gitlab/connections/oauth/callback`,
      response_type: 'code',
      state,
      scope: 'api read_user read_api read_repository',
    });

    return `${instance.baseUrl}/oauth/authorize?${params.toString()}`;
  }

  /**
   * 用授權碼換取 Access Token
   */
  async exchangeCodeForTokens(
    instance: GitLabInstance,
    code: string
  ): Promise<GitLabOAuthTokens> {
    // TODO: 實作
    // POST to ${instance.baseUrl}/oauth/token
    throw new Error('Not implemented');
  }

  /**
   * 刷新 Access Token
   */
  async refreshAccessToken(
    instance: GitLabInstance,
    refreshToken: string
  ): Promise<GitLabOAuthTokens> {
    // TODO: 實作
    throw new Error('Not implemented');
  }

  /**
   * 撤銷 Token
   */
  async revokeToken(instance: GitLabInstance, token: string): Promise<void> {
    // TODO: 實作
    // POST to ${instance.baseUrl}/oauth/revoke
  }
}

export default new GitLabOAuthService();
```

#### 2.5.2 Activity Service

建立 `backend/src/services/gitlab/activityService.ts`：

```typescript
import { GitLabConnection, GitLabActivity, GitLabActivityType } from '@prisma/client';
import { GitLabApiClient } from '../../utils/gitlab/apiClient';

export class GitLabActivityService {
  /**
   * 同步使用者的 GitLab 活動
   */
  async syncActivities(connection: GitLabConnection, since?: Date): Promise<number> {
    // TODO: 實作
    // 1. 建立 API client
    // 2. 取得 commits, MRs
    // 3. 轉換並儲存 GitLabActivity 記錄
    // 4. 計算 suggestedHours
    throw new Error('Not implemented');
  }

  /**
   * 計算活動的建議工時
   */
  calculateSuggestedHours(
    activityType: GitLabActivityType,
    additions?: number,
    deletions?: number
  ): number {
    switch (activityType) {
      case 'COMMIT':
        const linesChanged = (additions || 0) + (deletions || 0);
        return Math.min(0.25 + linesChanged / 100, 2.0);
      case 'MR_OPENED':
        return 0.5;
      case 'MR_MERGED':
      case 'MR_COMMENT':
      case 'MR_APPROVED':
        return 0.25;
      default:
        return 0;
    }
  }

  /**
   * 將活動轉換為工時記錄
   */
  async convertToTimeEntry(
    activity: GitLabActivity,
    hours: number,
    categoryId: string,
    description?: string
  ): Promise<string> {
    // TODO: 實作
    // 建立 TimeEntry
    // 更新 activity.timeEntryId
    throw new Error('Not implemented');
  }
}

export default new GitLabActivityService();
```

#### 2.5.3 Issue Service

建立 `backend/src/services/gitlab/issueService.ts`：

```typescript
import { GitLabConnection, GitLabIssueMapping, Task } from '@prisma/client';

export class GitLabIssueService {
  /**
   * 從 GitLab Issue 同步到任務
   */
  async syncFromGitLab(mapping: GitLabIssueMapping): Promise<void> {
    // TODO: 實作
    // 1. 取得 GitLab Issue 最新資料
    // 2. 更新任務狀態
    // 3. 更新 mapping.lastSyncAt
    throw new Error('Not implemented');
  }

  /**
   * 從任務同步到 GitLab Issue
   */
  async syncToGitLab(mapping: GitLabIssueMapping): Promise<void> {
    // TODO: 實作
    // 1. 取得任務最新資料
    // 2. 更新 GitLab Issue
    // 3. 更新 mapping.lastSyncAt
    throw new Error('Not implemented');
  }

  /**
   * 從任務建立 GitLab Issue
   */
  async createIssueFromTask(
    connection: GitLabConnection,
    projectPath: string,
    task: Task
  ): Promise<GitLabIssueMapping> {
    // TODO: 實作
    throw new Error('Not implemented');
  }

  /**
   * 狀態對應：GitLab -> Task
   */
  mapGitLabStateToTaskStatus(gitlabState: string): string {
    switch (gitlabState) {
      case 'opened':
        return 'IN_PROGRESS';
      case 'closed':
        return 'COMPLETED';
      default:
        return 'NOT_STARTED';
    }
  }

  /**
   * 狀態對應：Task -> GitLab
   */
  mapTaskStatusToGitLabState(taskStatus: string): 'opened' | 'closed' {
    switch (taskStatus) {
      case 'COMPLETED':
        return 'closed';
      default:
        return 'opened';
    }
  }
}

export default new GitLabIssueService();
```

### 2.6 更新主路由

更新 `backend/src/routes/index.ts`：

```typescript
import { Router } from 'express';
import authRoutes from './auth';
import employeeRoutes from './employees';
import projectRoutes from './projects';
import taskRoutes from './tasks';
import progressRoutes from './progress';
import timeEntryRoutes from './timeEntries';
import timeCategoryRoutes from './timeCategories';
import timeStatsRoutes from './timeStats';
import slackRoutes from './slack';
import gitlabRoutes from './gitlab';  // 新增

const router = Router();

router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/progress', progressRoutes);
router.use('/time-entries', timeEntryRoutes);
router.use('/time-categories', timeCategoryRoutes);
router.use('/time-stats', timeStatsRoutes);
router.use('/slack', slackRoutes);
router.use('/gitlab', gitlabRoutes);  // 新增

export default router;
```

### 2.7 環境變數配置

更新 `.env.example`：

```bash
# GitLab 整合
GITLAB_ENCRYPTION_KEY=your-32-char-encryption-key    # 用於加密 tokens
API_BASE_URL=https://api.yourdomain.com              # OAuth 回調用
```

---

## 驗收標準

### Schema 驗收
- [ ] Migration 成功執行，無錯誤
- [ ] 所有新 Model 可正常 CRUD
- [ ] 關聯關係正確建立
- [ ] Index 正確建立

### API 驗收
- [ ] 所有端點回應正確的 HTTP 狀態碼
- [ ] 權限驗證正確（Admin only / Authenticated）
- [ ] 請求參數驗證
- [ ] 錯誤處理完整

### 功能驗收
- [ ] 可新增/編輯/刪除 GitLab 實例
- [ ] OAuth 流程可完成帳號連結
- [ ] 可手動觸發活動同步
- [ ] Webhook 可正確接收事件

---

## 注意事項

### 安全性
1. **Token 加密**：`accessToken`, `refreshToken`, `clientSecret` 必須加密儲存
2. **Webhook 驗證**：必須驗證 `X-Gitlab-Token` header
3. **OAuth State**：必須使用隨機 state 防止 CSRF
4. **權限檢查**：確保使用者只能存取自己的 connections

### 效能
1. **Webhook 快速回應**：收到 webhook 後立即回應 200，異步處理
2. **批次處理**：同步活動時使用批次 insert
3. **Token 刷新**：Access Token 過期前主動刷新

### 資料一致性
1. **活動去重**：使用 `gitlabEventId` 確保不重複記錄
2. **Issue 同步衝突**：雙向同步需處理衝突（以較新的為準）

---

## 附錄：API 端點摘要

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| GET | /api/gitlab/instances | 列出實例 | Admin |
| POST | /api/gitlab/instances | 新增實例 | Admin |
| PUT | /api/gitlab/instances/:id | 更新實例 | Admin |
| DELETE | /api/gitlab/instances/:id | 刪除實例 | Admin |
| GET | /api/gitlab/connections | 我的連結 | Auth |
| GET | /api/gitlab/connections/oauth/:instanceId | 取得授權 URL | Auth |
| GET | /api/gitlab/connections/oauth/callback | OAuth 回調 | Public |
| PUT | /api/gitlab/connections/:id/settings | 更新設定 | Owner |
| DELETE | /api/gitlab/connections/:id | 斷開連結 | Owner |
| POST | /api/gitlab/connections/:id/sync | 手動同步 | Owner |
| GET | /api/gitlab/activities | 活動列表 | Auth |
| GET | /api/gitlab/activities/summary | 活動統計 | Auth |
| POST | /api/gitlab/activities/:id/convert | 轉換工時 | Auth |
| POST | /api/gitlab/activities/batch-convert | 批次轉換 | Auth |
| GET | /api/gitlab/issues/mappings | Issue 對應 | Auth |
| POST | /api/gitlab/issues/mappings | 建立對應 | Auth |
| POST | /api/gitlab/webhook/:instanceId | Webhook | Public |
