import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

interface OAuthStateData {
  userId: string;
  timestamp: number;
}

/**
 * Service for managing OAuth state tokens for CSRF protection.
 * 
 * NOTE: This implementation uses in-memory storage which is suitable for
 * single-instance deployments and development. For production with multiple
 * instances, replace this with Redis or database-backed implementation:
 * 
 * Production alternatives:
 * 1. Redis: Use ioredis with TTL for automatic expiration
 * 2. Database: Store states in a dedicated table with cleanup job
 * 3. JWT-based: Encode state data in signed JWT token
 */
@Injectable()
export class OAuthStateService {
  private readonly states = new Map<string, OAuthStateData>();
  private readonly STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Generate a new OAuth state token
   */
  generateState(userId: string): string {
    // Clean up expired states periodically
    this.cleanupExpiredStates();

    const state = crypto.randomBytes(32).toString('hex');
    this.states.set(state, { userId, timestamp: Date.now() });
    return state;
  }

  /**
   * Validate and consume an OAuth state token
   * Returns the userId if valid, null otherwise
   */
  validateAndConsume(state: string): string | null {
    const data = this.states.get(state);
    
    if (!data) {
      return null;
    }

    // Remove the state (one-time use)
    this.states.delete(state);

    // Check if expired
    if (Date.now() - data.timestamp > this.STATE_TTL_MS) {
      return null;
    }

    return data.userId;
  }

  /**
   * Clean up expired state tokens
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [state, data] of this.states.entries()) {
      if (now - data.timestamp > this.STATE_TTL_MS) {
        this.states.delete(state);
      }
    }
  }
}
