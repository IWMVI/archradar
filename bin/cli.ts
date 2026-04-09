#!/usr/bin/env node

import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import path from "path";
import * as Scanner from "../src/core/scanner/index.js";
import * as Analyzer from "../src/core/analyzer/index.js";
import * as ScoreEngine from "../src/core/scoring/index.js";
import * as Reporter from "../src/core/report/index.js";
import { validateProjectPath, isDirectory, isReadable, ValidationError } from "../src/utils/validation.js";

const program = new Command();

program
  .name("archradar")
  .description(
    "Architectural Intelligence Engine for modern teams — by Few Company",
  )
  .version("0.1.0");

program
  .command("scan [projectPath]")
  .description(
    "Analyze the architectural health of a project (JavaScript/TypeScript or Java/Spring Boot)",
  )
  .action(async (projectPath?: string) => {
    let targetPath: string;

    try {
      targetPath = validateProjectPath(projectPath ?? ".");
    } catch (error) {
      console.error(chalk.red("Error: Invalid project path"));
      if (error instanceof ValidationError) {
        console.error(chalk.yellow(error.message));
      }
      process.exit(1);
    }

    const spinner = ora("Scanning project...").start();

    try {
      const isDir = await isDirectory(targetPath);
      if (!isDir) {
        throw new Error(`Path is not a directory: ${targetPath}`);
      }

      const canRead = await isReadable(targetPath);
      if (!canRead) {
        throw new Error(`Cannot read directory: ${targetPath}`);
      }

      spinner.text = "Detecting project type...";
      const projectType = await Scanner.detectProjectType(targetPath);

      spinner.text = "Scanning files and dependencies...";
      const scanResult = await Scanner.run(targetPath);

      spinner.text = "Running AST analysis...";
      const analysisResult = await Analyzer.run(targetPath, projectType);

      spinner.text = "Calculating architectural score...";
      const scoreResult = ScoreEngine.run(
        scanResult,
        analysisResult,
        projectType,
      );

      spinner.succeed("Analysis complete");

      Reporter.display(scanResult, analysisResult, scoreResult, projectType);
    } catch (error) {
      spinner.fail("Analysis failed");

      if (error instanceof ValidationError) {
        console.error(chalk.red("Validation Error:"));
        console.error(chalk.yellow(error.message));
      } else if (error instanceof Error) {
        console.error(chalk.red("Error:"));
        console.error(chalk.yellow(error.message));

        if (process.env.DEBUG) {
          console.error(chalk.gray(error.stack || ""));
        }
      } else {
        console.error(chalk.red("Unknown error occurred"));
      }

      process.exit(1);
    }
  });

program.parse(process.argv);

if (process.argv.length === 2) {
  program.parse(["node", "archradar", "scan"]);
}
