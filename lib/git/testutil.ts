/**
 * @module
 * Test utilities.
 */
import {
    Clock,
    SystemClock,
} from '@lib/clock';
import {
    call,
    checkCall,
    checkOutput,
    Shell,
    ShellOptions,
} from '@lib/shell';
import * as tmp from '@lib/tmp';
import fs from 'fs-extra';
import path from 'path';

/**
 * Options for `GitShell`
 */
export interface GitShellOptions {
    dir: string;
    clock?: Clock;
    authorName: string;
    authorEmail: string;
    committerName: string;
    committerEmail: string;
}

/**
 * Provides easy access to a Git repository.
 */
export class GitShell implements Shell {
    dir: string;
    clock: Clock;
    authorName: string;
    authorEmail: string;
    committerName: string;
    committerEmail: string;

    constructor(opts: GitShellOptions) {
        this.dir = opts.dir;
        this.clock = opts.clock || new SystemClock();
        this.authorName = opts.authorName;
        this.authorEmail = opts.authorEmail;
        this.committerName = opts.committerName;
        this.committerEmail = opts.committerEmail;
    }

    call(command: string, args: string[], options?: ShellOptions): Promise<number> {
        const shellOptions = Object.assign(this.getShellOptions(), options);
        return call(command, args, shellOptions);
    }

    checkCall(command: string, args: string[], options?: ShellOptions): Promise<void> {
        const shellOptions = Object.assign(this.getShellOptions(), options);
        return checkCall(command, args, shellOptions);
    }

    checkOutput(command: string, args: string[], options?: ShellOptions): Promise<string> {
        const shellOptions = Object.assign(this.getShellOptions(), options);
        return checkOutput(command, args, shellOptions);
    }

    writeFile(filename: string, data: string): Promise<void> {
        return fs.writeFile(path.join(this.dir, filename), data, 'utf-8');
    }

    private getShellOptions(): ShellOptions {
        const currentTime = Math.floor(this.clock.now() / 1000);
        return {
            cwd: this.dir,
            env: {
                EDITOR: ':',
                GIT_ATTR_NOSYSTEM: '1',
                GIT_AUTHOR_DATE: `${currentTime} +0000`,
                GIT_AUTHOR_EMAIL: this.authorEmail,
                GIT_AUTHOR_NAME: this.authorName,
                GIT_COMMITTER_DATE: `${currentTime} +0000`,
                GIT_COMMITTER_EMAIL: this.committerEmail,
                GIT_COMMITTER_NAME: this.committerName,
                GIT_CONFIG_NOSYSTEM: '1',
                GIT_MERGE_AUTOEDIT: 'no',
                GIT_MERGE_VERBOSITY: '5',
                HOME: this.dir,
                LANG: 'C',
                LC_ALL: 'C',
                PAGER: 'cat',
                PATH: process.env.PATH || '',
                TZ: 'UTC',
            },
        };
    }
}

interface MakeTmpGitRepoOptions {
    clock: Clock;
    authorName?: string;
    authorEmail?: string;
    committerName?: string;
    committerEmail?: string;
}

/**
 * A temporary git repo meant for testing.
 */
export class TmpGitRepo implements Shell {
    private readonly gitShell: GitShell;
    private readonly tmpDir: tmp.TmpDir;

    constructor(tmpDir: tmp.TmpDir, options: MakeTmpGitRepoOptions) {
        this.tmpDir = tmpDir;
        this.gitShell = new GitShell({
            authorEmail: options.authorEmail || 'author@example.com',
            authorName: options.authorName || 'A U Thor',
            clock: options.clock,
            committerEmail: 'committer@example.com',
            committerName: 'C O Mitter',
            dir: this.tmpDir.path,
        });
    }

    cleanup(): void {
        this.tmpDir.cleanup();
    }

    call(command: string, args: string[], options?: ShellOptions): Promise<number> {
        return this.gitShell.call(command, args, options);
    }

    checkCall(command: string, args: string[], options?: ShellOptions): Promise<void> {
        return this.gitShell.checkCall(command, args, options);
    }

    checkOutput(command: string, args: string[], options?: ShellOptions): Promise<string> {
        return this.gitShell.checkOutput(command, args, options);
    }

    writeFile(filename: string, data: string): Promise<void> {
        return this.gitShell.writeFile(filename, data);
    }
}

export async function makeTmpGitRepo(options: MakeTmpGitRepoOptions): Promise<TmpGitRepo> {
    const tmpDir = await tmp.dir({
        unsafeCleanup: true,
    });
    const repo = new TmpGitRepo(tmpDir, options);
    try {
        await repo.checkCall('git', ['init']);
    } catch (e) {
        repo.cleanup();
        throw e;
    }
    return repo;
}

interface CloneRepoOptions extends MakeTmpGitRepoOptions {
    url: string;
}

export async function cloneRepo(options: CloneRepoOptions): Promise<TmpGitRepo> {
    const tmpDir = await tmp.dir({
        unsafeCleanup: true,
    });
    const repo = new TmpGitRepo(tmpDir, options);
    try {
        await repo.checkCall('git', ['clone', options.url, tmpDir.path]);
    } catch (e) {
        repo.cleanup();
        throw e;
    }
    return repo;
}
