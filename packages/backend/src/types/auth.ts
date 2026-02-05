export interface JwtPayload {
  userId: string
  email: string
  role: string
  iat?: number
  exp?: number
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface SlackOAuthResponse {
  ok: boolean
  access_token?: string
  user?: {
    id: string
    name: string
    email: string
    image_72?: string
  }
  team?: {
    id: string
    name: string
  }
  error?: string
}

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  role: string
  avatar?: string
}
