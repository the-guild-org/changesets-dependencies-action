import { exec } from "@actions/exec";
import { execWithOutput } from "./utils";

export const setupUser = async () => {
  await exec("git", ["config", "user.name", `"github-actions[bot]"`]);
  await exec("git", [
    "config",
    "user.email",
    `"github-actions[bot]@users.noreply.github.com"`,
  ]);
};

export const fetch = async () => {
  await exec("git", ["fetch"]);
};

export const push = async (
  branch?: string,
  { force }: { force?: boolean } = {}
) => {
  await exec(
    "git",
    [
      "push",
      "origin",
      branch ? `HEAD:${branch}` : undefined,
      force && "--force",
    ].filter<string>(Boolean as any)
  );
};

export const pushTags = async () => {
  await exec("git", ["push", "origin", "--tags"]);
};

export const switchToMaybeExistingBranch = async (branch: string) => {
  await execWithOutput("git", ["checkout", "-t", `origin/${branch}`]);
};

export const reset = async (
  pathSpec: string,
  mode: "hard" | "soft" | "mixed" = "hard"
) => {
  await exec("git", ["reset", `--${mode}`, pathSpec]);
};

export const commitAll = async (message: string) => {
  await exec("git", ["add", "."]);
  await exec("git", ["commit", "-m", message]);
};

export const checkIfClean = async (): Promise<boolean> => {
  const { stdout } = await execWithOutput("git", ["status", "--porcelain"]);
  return !stdout.length;
};
