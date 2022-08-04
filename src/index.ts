import * as core from "@actions/core";
import * as github from "@actions/github";
import { setupGitCredentials, setupGitUser } from "./utils";
import fetch from "node-fetch";
import { getPackages } from "@manypkg/get-packages";
import path from "path";
import { PackageJSON } from "@changesets/types";
import write from "@changesets/write";
import { diff, IChange, Operation } from "json-diff-ts";
import { read, defaultConfig } from "@changesets/config";

function textify(d: IChange, location: string) {
  const link = `([\`${d.key}\` @ \`${d.value}\` ↗︎](https://www.npmjs.com/package/${d.key}/v/${d.value}))`;

  switch (d.type) {
    case Operation.ADD: {
      return `Added dependency ${link} (under \`${location}\`)`;
    }
    case Operation.UPDATE: {
      return `Updated dependency ${link} (was \`${d.oldValue}\`, under \`${location}\`)`;
    }
    case Operation.REMOVE: {
      return `Removed dependency ${link} (under \`${location}\`)`;
    }
  }
}

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
  // console.log("Git context:", JSON.stringify(github.context, null, 2));
  let githubToken = process.env.GITHUB_TOKEN;

  if (!githubToken) {
    core.setFailed("Please add the GITHUB_TOKEN to the changesets action");
    return;
  }

  const baseSha = github.context.payload.pull_request?.base.sha;

  if (!baseSha) {
    core.setFailed(
      "Please find base SHA, please make sure you are running in a PR context"
    );
    return;
  }

  const octokit = github.getOctokit(githubToken);

  console.debug("setting GitHub User");
  await setupGitUser();
  console.debug("setting GitHub credentials");
  await setupGitCredentials(githubToken);

  const issueContext = github.context.issue;

  if (!issueContext?.number) {
    core.warning(`Failed to locate a PR associated with the Action context:`);
    core.setFailed(`Failed to locate a PR associated with the Action context`);

    return;
  }

  const packages = await getPackages(process.cwd());
  const changesetsConfig = await read(process.cwd(), packages).catch((e) => {
    console.warn(
      `Failed to read changesets config: ${e.message}, using default config...`
    );

    return defaultConfig;
  });
  const relevantPackages = packages.packages
    .filter(
      (pkg) =>
        !changesetsConfig.ignore.includes(pkg.packageJson.name) &&
        !pkg.packageJson.private
    )
    .map((p) => ({
      ...p,
      absolutePath: `${p.dir}/package.json`,
      relativePath: path.relative(process.cwd(), `${p.dir}/package.json`),
    }));

  console.debug("relevant packages:", relevantPackages);

  const changes = new Map<
    string,
    {
      dependencies: IChange[];
      peerDependencies: IChange[];
    }
  >();

  for (const pkg of relevantPackages) {
    const oldPackageFile = (await fetchJsonFile(githubToken!, {
      ...github.context.repo,
      path: pkg.relativePath,
      ref: baseSha,
    })) as PackageJSON;

    if (oldPackageFile) {
      if (!changes.has(pkg.packageJson.name)) {
        changes.set(pkg.packageJson.name, {
          dependencies: [],
          peerDependencies: [],
        });
      }

      changes.get(pkg.packageJson.name)!.dependencies = diff(
        oldPackageFile.dependencies || {},
        pkg.packageJson.dependencies || {}
      );
      changes.get(pkg.packageJson.name)!.peerDependencies = diff(
        oldPackageFile.peerDependencies || {},
        pkg.packageJson.peerDependencies || {}
      );
    } else {
      core.warning(
        `Failed to locate previous file content of ${pkg.relativePath}, skipping ${pkg.packageJson.name}...`
      );
    }
  }

  for (const [key, value] of changes) {
    const changes = [
      ...value.dependencies.map((d) => textify(d, "dependencies")),
      ...value.peerDependencies.map((d) => textify(d, "peerDependencies")),
    ].map((t) => `- ${t}`);

    console.log("summary", changes);

    const changeset = await write(
      {
        releases: [
          {
            name: key,
            type: "patch",
          },
        ],
        summary: changes.join("\n"),
      },
      process.cwd()
    );

    console.log(changeset);
  }

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
