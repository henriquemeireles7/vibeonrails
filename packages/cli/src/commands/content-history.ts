/**
 * Content Version History
 *
 * `vibe content history <file>` — shows git log with diffs for a content file.
 * `vibe content restore <file> <commit>` — restores a previous version.
 *
 * AI can compare: "This hook performed 2x better before last edit."
 */

import { Command } from "commander";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, relative } from "node:path";
import chalk from "chalk";
import { createFormatter } from "../output/formatter.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContentHistoryEntry {
  commit: string;
  author: string;
  date: string;
  message: string;
}

export interface ContentDiff {
  commit: string;
  diff: string;
}

// ---------------------------------------------------------------------------
// Git helpers (thin wrappers for testability)
// ---------------------------------------------------------------------------

export function getGitLog(
  filePath: string,
  cwd: string,
  limit = 20,
): ContentHistoryEntry[] {
  try {
    const relPath = relative(cwd, resolve(filePath));
    const raw = execSync(
      `git log --format="%H||%an||%ai||%s" -n ${limit} -- "${relPath}"`,
      { cwd, encoding: "utf-8" },
    ).trim();

    if (!raw) return [];

    return raw.split("\n").map((line) => {
      const [commit, author, date, message] = line.split("||");
      return {
        commit: commit ?? "",
        author: author ?? "",
        date: date ?? "",
        message: message ?? "",
      };
    });
  } catch {
    return [];
  }
}

export function getGitDiff(
  filePath: string,
  commit: string,
  cwd: string,
): string {
  try {
    const relPath = relative(cwd, resolve(filePath));
    return execSync(`git diff ${commit}^..${commit} -- "${relPath}"`, {
      cwd,
      encoding: "utf-8",
    }).trim();
  } catch {
    return "";
  }
}

export function getFileAtCommit(
  filePath: string,
  commit: string,
  cwd: string,
): string {
  const relPath = relative(cwd, resolve(filePath));
  return execSync(`git show ${commit}:"${relPath}"`, {
    cwd,
    encoding: "utf-8",
  });
}

export function restoreFileFromCommit(
  filePath: string,
  commit: string,
  cwd: string,
): void {
  const relPath = relative(cwd, resolve(filePath));
  execSync(`git checkout ${commit} -- "${relPath}"`, { cwd });
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

export function formatHistoryEntry(
  entry: ContentHistoryEntry,
  index: number,
): string {
  const lines: string[] = [];
  lines.push(
    `  ${chalk.dim(`${index + 1}.`)} ${chalk.yellow(entry.commit.slice(0, 8))} — ${entry.message}`,
  );
  lines.push(
    `     ${chalk.dim(entry.author)} ${chalk.dim(entry.date)}`,
  );
  return lines.join("\n");
}

export function formatDiff(diff: string): string {
  if (!diff) return chalk.dim("  (no changes in this commit)");

  return diff
    .split("\n")
    .map((line) => {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        return chalk.green(`  ${line}`);
      }
      if (line.startsWith("-") && !line.startsWith("---")) {
        return chalk.red(`  ${line}`);
      }
      if (line.startsWith("@@")) {
        return chalk.cyan(`  ${line}`);
      }
      return chalk.dim(`  ${line}`);
    })
    .join("\n");
}

// ---------------------------------------------------------------------------
// CLI Command
// ---------------------------------------------------------------------------

/**
 * `vibe content` — Content management subcommands.
 */
export function contentCommand(): Command {
  const content = new Command("content").description(
    "Content versioning and management",
  );

  content
    .command("history <file>")
    .description("Show git history for a content file")
    .option("-n, --limit <count>", "Number of commits to show", "20")
    .option("--diff", "Show diffs for each commit")
    .option("--json", "Output as JSON")
    .action(
      (
        file: string,
        options: { limit: string; diff?: boolean; json?: boolean },
      ) => {
        const fmt = createFormatter();
        const cwd = process.cwd();
        const filePath = resolve(cwd, file);

        if (!existsSync(filePath)) {
          fmt.error({
            command: "content history",
            message: `File not found: ${file}`,
            fix: "Check the file path and try again.",
          });
          process.exit(1);
        }

        const entries = getGitLog(filePath, cwd, parseInt(options.limit, 10));

        if (entries.length === 0) {
          fmt.info("No git history found for this file.");
          return;
        }

        if (options.json) {
          if (options.diff) {
            const withDiffs = entries.map((e) => ({
              ...e,
              diff: getGitDiff(filePath, e.commit, cwd),
            }));
            console.log(JSON.stringify(withDiffs, null, 2));
          } else {
            console.log(JSON.stringify(entries, null, 2));
          }
          return;
        }

        fmt.info(
          chalk.bold(`\nHistory for ${chalk.cyan(file)} (${entries.length} commits):\n`),
        );

        for (let i = 0; i < entries.length; i++) {
          console.log(formatHistoryEntry(entries[i]!, i));
          if (options.diff) {
            const diff = getGitDiff(filePath, entries[i]!.commit, cwd);
            console.log(formatDiff(diff));
          }
          console.log();
        }
      },
    );

  content
    .command("restore <file> <commit>")
    .description("Restore a content file to a specific commit version")
    .option("--json", "Output as JSON")
    .action((file: string, commit: string, options: { json?: boolean }) => {
      const fmt = createFormatter();
      const cwd = process.cwd();

      try {
        restoreFileFromCommit(file, commit, cwd);

        fmt.success({
          command: "content restore",
          data: { file, commit },
          message: chalk.green(
            `Restored ${chalk.cyan(file)} to commit ${chalk.yellow(commit.slice(0, 8))}`,
          ),
          nextSteps: [
            `Review the restored file: ${chalk.dim(`cat ${file}`)}`,
            `Commit the change: ${chalk.dim(`git add ${file} && git commit -m "Restore ${file} to ${commit.slice(0, 8)}"`)}`
          ],
        });
      } catch {
        fmt.error({
          command: "content restore",
          message: `Failed to restore ${file} to commit ${commit}`,
          fix: "Ensure the commit hash is valid and the file existed at that commit.",
        });
        process.exit(1);
      }
    });

  content
    .command("reindex")
    .description("Rebuild the content index")
    .action(() => {
      const fmt = createFormatter();
      fmt.info("Content reindex is handled by the build system.");
      fmt.info("Run: vibe build to rebuild all content indexes.");
    });

  return content;
}
