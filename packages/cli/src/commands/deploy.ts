import { Command } from "commander";
import chalk from "chalk";

/**
 * `aor deploy <target>` — Deploy to cloud providers.
 * Currently a placeholder — will be expanded in future releases.
 */
export function deployCommand(): Command {
  return new Command("deploy")
    .description("Deploy to a cloud provider")
    .argument("[target]", "Deployment target (railway, fly)", "railway")
    .action((target: string) => {
      console.log(
        chalk.yellow(
          `\n  Deploy to ${target} is coming soon.\n`,
        ),
      );
      console.log("  For now, use:");
      console.log(
        chalk.dim(
          `    ${target === "fly" ? "fly deploy" : "railway up"}\n`,
        ),
      );
    });
}
