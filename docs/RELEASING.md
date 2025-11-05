# Release Process

This project uses automated GitHub releases and NPM publishing triggered by annotated Git tags.

## Creating a Release

### Prerequisites
- You must be on the `main` branch
- Your local branch must be up to date with `origin/main`
- All changes must be committed and pushed

### Steps

1. **Update the version in package.json**
   ```bash
   # Edit package.json and update the version field
   # For example, change "version": "0.0.3" to "version": "0.0.4"
   ```

2. **Commit the version change**
   ```bash
   git add package.json
   git commit -m "Bump version to 0.0.4"
   git push origin main
   ```

3. **Create an annotated tag**
   ```bash
   # Create an annotated tag with a message describing the release
   git tag -a v0.0.4 -m "Release v0.0.4

   New features:
   - Feature 1
   - Feature 2

   Bug fixes:
   - Fix issue #123
   - Fix bug in XYZ"
   ```

   **Important:** 
   - Use **annotated tags** (`-a` flag), not lightweight tags
   - Follow semantic versioning (e.g., `v1.2.3`)
   - Tag name must start with `v` (e.g., `v0.0.4`)
   - The tag message will be used as the GitHub release notes

4. **Push the tag**
   ```bash
   git push origin v0.0.4
   ```

## What Happens Next

Once you push the tag, the GitHub Actions workflow will:

1. ✅ **Verify the tag**
   - Confirms it's an annotated tag
   - Confirms it's on the HEAD of the `main` branch
   - Fails if either check doesn't pass

2. 📝 **Create GitHub Release**
   - Creates a GitHub release with the tag
   - Uses the tag message as release notes

3. 🔨 **Build and Test**
   - Runs type checking
   - Runs all tests
   - Builds the TypeScript to JavaScript

4. 📦 **Publish to NPM**
   - Publishes the compiled package to NPM
   - Uses the version from `package.json`

## Quick Reference

```bash
# Complete release workflow
vim package.json              # Update version
git add package.json
git commit -m "Bump version to v0.0.4"
git push origin main
git tag -a v0.0.4 -m "Release notes here"
git push origin v0.0.4
```

## Troubleshooting

### Tag not on main branch HEAD
**Error:** Tag is not on the HEAD of main branch

**Solution:** Make sure you're creating the tag on the latest commit of main:
```bash
git checkout main
git pull origin main
git tag -a v0.0.4 -m "Release notes"
git push origin v0.0.4
```

### Not an annotated tag
**Error:** Tag is not an annotated tag

**Solution:** Use the `-a` flag when creating tags:
```bash
# ❌ Wrong (lightweight tag)
git tag v0.0.4

# ✅ Correct (annotated tag)
git tag -a v0.0.4 -m "Release notes"
```

### Deleting a tag if something goes wrong
```bash
# Delete local tag
git tag -d v0.0.4

# Delete remote tag
git push origin :refs/tags/v0.0.4
```

## Secrets Required

The GitHub Actions workflow requires these secrets to be configured:
- `NPM_TOKEN` - NPM access token for publishing (must be configured in repository settings)
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

