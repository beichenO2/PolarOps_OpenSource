/**
 * knowlever-monitor.ts — KnowLever pipeline monitoring.
 *
 * Migrated from SOTAgent/src/knowlever-monitor.ts.
 * Watches KnowLever raw directories for changes, tracks pipeline runs.
 */

import fs from 'node:fs';
import path from 'node:path';

const POLARISOR = path.join(process.env.HOME || '~', 'Polarisor');
const KNOWLEVER_ROOT = path.join(POLARISOR, 'KnowLever');

export type PipelineStep = 'idle' | 'ingest' | 'compile' | 'build' | 'done' | 'error';

export interface ITopicStatus {
  name: string;
  available: boolean;
  rawFileCount: number;
  normalizedCount: number;
  wikiPageCount: number;
  pipeline: { step: PipelineStep; progress: number } | null;
  lastCompile: string | null;
  dataPath: string;
}

export interface IKnowLeverStatus {
  available: boolean;
  rootPath: string;
  topicCount: number;
  topics: ITopicStatus[];
}

export class KnowLeverMonitor {
  private rootPath: string;

  constructor(rootPath?: string) {
    this.rootPath = rootPath ?? KNOWLEVER_ROOT;
  }

  async getStatus(): Promise<IKnowLeverStatus> {
    const available = fs.existsSync(this.rootPath);
    const topics: ITopicStatus[] = [];

    if (available) {
      const dataUsersPath = path.join(this.rootPath, 'data', 'users');
      if (fs.existsSync(dataUsersPath)) {
        for (const user of fs.readdirSync(dataUsersPath)) {
          const topicsPath = path.join(dataUsersPath, user, 'topics');
          if (!fs.existsSync(topicsPath)) continue;
          for (const topic of fs.readdirSync(topicsPath)) {
            const topicPath = path.join(topicsPath, topic);
            if (!fs.statSync(topicPath).isDirectory()) continue;
            topics.push(this.scanTopic(topic, topicPath));
          }
        }
      }
    }

    return {
      available,
      rootPath: this.rootPath,
      topicCount: topics.length,
      topics,
    };
  }

  private scanTopic(name: string, topicPath: string): ITopicStatus {
    const rawDir = path.join(topicPath, 'raw');
    const normalizedDir = path.join(topicPath, 'normalized');
    const wikiDir = path.join(topicPath, 'wiki');

    return {
      name,
      available: true,
      rawFileCount: this.countFiles(rawDir),
      normalizedCount: this.countFiles(normalizedDir),
      wikiPageCount: this.countFiles(wikiDir),
      pipeline: null,
      lastCompile: null,
      dataPath: topicPath,
    };
  }

  private countFiles(dir: string): number {
    try {
      if (!fs.existsSync(dir)) return 0;
      return fs.readdirSync(dir).length;
    } catch {
      return 0;
    }
  }
}
