# changesets-dependencies-action

A GitHub Action for creating Changesets files for dependencies updates.

This action will automatically monitor all your PRs, and find changes in `package.json` files. Then it creates/updates a `changeset` file, and commits it to your PR.

> Works great with Renovate and dependabot!

This Action only create Changeset files for the following:

- Packages that are under the monorepo/Workspace and not being ignored.
- Packages that are not marked as `private: true`.
- Packages that are located in `dependencies` or `peerDependencies`.
- Packages that are not ignored by `changesets` config.

## Features

- Automatic Changesets based on changes in `package.json`
- Smart `semver` inference and links to NPM
- Integration with Prettier (for the created YAML file)
- Flexible CI execution (depends on token, see below)

## Usage (with default token)

Create a GitHub Actions workflow with the following:

```yaml
name: dependencies
on: pull_request
jobs:
  changeset:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Create/Update Changesets
        uses: "the-guild-org/changesets-dependencies-action@v1.1.0"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Usage (with custom token)

**Note: using `secrets.GITHUB_TOKEN` will not trigger CI again.**

If you wish that the created commit will also trigger CI, you must create a custom PAT from any regular GitHub user ([instructions here](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)).

Then, add it to your repository `Secrets` with a custom name (`MY_GH_TOKEN` in this example. Then, configure the `checkout` action as below and use the custom token for this action:

```yaml
name: dependencies
on: pull_request
jobs:
  changeset:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        with:
          fetch-depth: 0
          token: ${{ secrets.MY_GH_TOKEN }} # use it here

      - name: Create/Update Changesets
        uses: "the-guild-org/changesets-dependencies-action@v1.1.0"
        env:
          GITHUB_TOKEN: ${{ secrets.MY_GH_TOKEN }} # and also here
```

> The created commit will still appear as `github-actions-bot`, but this time it will run CI ;)
