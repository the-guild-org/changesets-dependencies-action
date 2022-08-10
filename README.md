# changesets-dependencies-action

A GitHub Action for creating Changesets files for dependencies updates.

This action will automatically monitor all your PRs, and find changes in `package.json` files. Then it creates/updates a `changeset` file, and commits it to your PR.

> Works great with Renovate and dependabot!

This Action only create Changeset files for the following:

- Packages that are under the monorepo/Workspace and not being ignored. 
- Packages that are not marked as `private: true`.
- Packages that are located in `dependencies` or `peerDependencies`. 
- Packages that are not ignored by `changesets` config.

## Usage

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
        uses: "the-guild-org/changesets-dependencies-action@main"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

