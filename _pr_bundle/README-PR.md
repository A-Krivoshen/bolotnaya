# PR Helper: add camera pages (RU)

This bundle contains two content pages with `stream_url` frontmatter:

- `content/ru/cameras/bolotnaya-square/index.md` (lmost_new)
- `content/ru/cameras/ul-serafimovicha/index.md` (boloto_new)

## How to use

1. Extract this archive into your repo root, but *keep it inside a folder* like `./_pr_bundle`:
   ```bash
   mkdir -p _pr_bundle
   tar -xzf bolotnaya-pr-bundle-2025-08-10.tar.gz -C _pr_bundle
   ```

2. Ensure you already applied the template/JS/CSS patch I sent earlier.

3. Create a PR branch and push (requires clean working tree):
   ```bash
   bash _pr_bundle/make_pr.sh
   ```
   - If you have GitHub CLI (`gh`) authenticated, the PR will be created automatically.
   - Otherwise, open GitHub and create a PR from branch `feat/camera-player-and-pages`.

4. Run locally:
   ```bash
   hugo server -D --ignoreCache
   ```
   Check:
   - `/ru/cameras/bolotnaya-square/` → should load lmost_new
   - `/ru/cameras/ul-serafimovicha/` → should load boloto_new

You can later extend TinaCMS schema to edit `stream2_url` or `streams[]` if you want multi-angle tabs on a single page.
