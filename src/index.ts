import * as core from "@actions/core";
import { setupGitCredentials, setupGitUser } from "./utils";

(async () => {
  let githubToken = process.env.GITHUB_TOKEN;

  if (!githubToken) {
    core.setFailed("Please add the GITHUB_TOKEN to the changesets action");
    return;
  }

  console.log("setting GitHub User");
  await setupGitUser();
  console.log("setting GitHub credentials");
  await setupGitCredentials(githubToken);
})().catch((err) => {
  console.error(err);
  core.setFailed(err.message);
});
