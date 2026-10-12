import type { Preferences, UpdatePreferencesRequest, UserProfile } from "@sequel/contracts"
import { tables, type Database } from "@sequel/db"
import { eq } from "drizzle-orm"
import { DEFAULT_PREFERENCES } from "./defaults"

export type LocalUserSpec = { id: string; handle: string; displayName: string; roleTitle: string }

export class IdentityService {
  constructor(
    private readonly db: Database,
    private readonly localUser: LocalUserSpec,
  ) {}

  get currentUserId(): string {
    return this.localUser.id
  }

  async ensureLocalUser(): Promise<void> {
    await this.db
      .insert(tables.users)
      .values(this.localUser)
      .onConflictDoUpdate({
        target: tables.users.id,
        set: {
          handle: this.localUser.handle,
          displayName: this.localUser.displayName,
          roleTitle: this.localUser.roleTitle,
        },
      })
    await this.db
      .insert(tables.userPreferences)
      .values({ userId: this.localUser.id, ...DEFAULT_PREFERENCES })
      .onConflictDoNothing()
  }

  async profile(userId: string): Promise<UserProfile> {
    const row = await this.db.query.users.findFirst({ where: eq(tables.users.id, userId) })
    if (!row) {
      await this.ensureLocalUser()
      return {
        id: this.localUser.id,
        handle: this.localUser.handle,
        displayName: this.localUser.displayName,
        roleTitle: this.localUser.roleTitle,
      }
    }
    return {
      id: row.id,
      handle: row.handle,
      displayName: row.displayName,
      roleTitle: row.roleTitle,
    }
  }

  async preferences(userId: string): Promise<Preferences> {
    const row = await this.db.query.userPreferences.findFirst({
      where: eq(tables.userPreferences.userId, userId),
    })
    if (!row) {
      return DEFAULT_PREFERENCES
    }
    return {
      editorFontSize: row.editorFontSize,
      editorTabSize: row.editorTabSize,
      editorWordWrap: row.editorWordWrap,
      editorLineNumbers: row.editorLineNumbers,
      editorAutocomplete: row.editorAutocomplete,
      resultPageSize: row.resultPageSize,
      defaultTrack: row.defaultTrack,
      llmFeedbackEnabled: row.llmFeedbackEnabled,
    }
  }

  async updatePreferences(userId: string, patch: UpdatePreferencesRequest): Promise<Preferences> {
    const current = await this.preferences(userId)
    const next = { ...current, ...patch }
    await this.db
      .insert(tables.userPreferences)
      .values({ userId, ...next })
      .onConflictDoUpdate({ target: tables.userPreferences.userId, set: next })
    return next
  }
}
