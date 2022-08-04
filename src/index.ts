import * as core from "@actions/core";
import * as github from "@actions/github";
import { setupGitCredentials, setupGitUser } from "./utils";
import fetch from "node-fetch";
import { getPackages } from "@manypkg/get-packages";
import path from "path";

async function fetchFile(
  pat: string,
  file: {
    path: string;
    owner: string;
    repo: string;
    ref: string;
  }
) {
  return await fetch(
    `https://raw.githubusercontent.com/${file.owner}/${file.repo}/${file.ref}/${file.path}`,
    {
      headers: {
        Authorization: `Token ${pat}`,
      },
    }
  ).catch((err) => {
    console.error(err);

    throw err;
  });
}

async function fetchJsonFile(
  pat: string,
  file: {
    path: string;
    owner: string;
    repo: string;
    ref: string;
  }
) {
  return await fetchFile(pat, file)
    .then((x) => x.json())
    .catch(() => null);
}

(async () => {
  console.log("Git context:", JSON.stringify(github.context, null, 2));
  let githubToken = process.env.GITHUB_TOKEN;

  if (!githubToken) {
    core.setFailed("Please add the GITHUB_TOKEN to the changesets action");
    return;
  }

  const octokit = github.getOctokit(githubToken);

  console.log("setting GitHub User");
  await setupGitUser();
  console.log("setting GitHub credentials");
  await setupGitCredentials(githubToken);

  const issueContext = github.context.issue;

  if (!issueContext?.number) {
    console.debug(github.context);
    core.warning(`Failed to locate a PR associated with the Action context:`);
    core.setFailed(`Failed to locate a PR associated with the Action context`);

    return;
  }

  const { packages } = await getPackages(process.cwd());
  const relevantPackages = packages.map((p) => ({
    ...p,
    absolutePath: `${p.dir}/package.json`,
    relativePath: path.relative(process.cwd(), `${p.dir}/package.json`),
  }));

  console.log("relevant packages:", relevantPackages);

  // for (const package of relevantPackages) {
  //   const oldPackageFile = await fetchJsonFile(githubToken!, {
  //     owner: github.context.repo.owner,
  //     repo: github.context.repo.repo,
  //     path: filePath!,
  //     ref: github.context.payload.pull_request,
  //   });
  // }

  // const { data: changes } = await octokit.rest.git.getTree({
  //   ...github.context.repo,
  //   recursive: "1",
  //   tree_sha: github.context.ref,
  // });

  // console.log(`Changes files: `, changes.tree);

  // const filesToScan = changes.tree
  //   .map((item) =>
  //     item.path && item.path.endsWith("/package.json") ? item.path : null
  //   )
  //   .filter(Boolean);

  // console.debug(
  //   `Found total of ${filesToScan.length} changed package.json files to check:`,
  //   filesToScan.join(", ")
  // );

  // if (filesToScan.length) {
  //   const filesContent = await Promise.all(
  //     filesToScan.map(async (filePath) => {
  //       try {
  //         const newPackageFile = await fetchJsonFile(githubToken!, {
  //           owner: github.context.repo.owner,
  //           repo: github.context.repo.repo,
  //           path: filePath!,
  //           ref: github.context.ref,
  //         });

  //         return {
  //           filePath,
  //           newPackageFile,
  //         };
  //         // const oldPackageFile = await fetchJsonFile(githubToken!, {
  //         //   owner: github.context.repo.owner,
  //         //   repo: github.context.repo.repo,
  //         //   path: filePath!,
  //         //   ref: github.context.payload.pull_request,
  //         // });
  //       } catch (e) {
  //         console.warn(`Failed to fetch package.json file: ${filePath}`, e);

  //         return null;
  //       }
  //     })
  //   );

  //   console.log(filesContent);
  // } else {
  //   core.info(`Failed to locate any package.json files to scan in the PR`);
  // }
})().catch((err) => {
  console.error(err);
  core.setFailed(err.message);
});
