#!/bin/bash
set -euo pipefail

APP_NAME="Claude Island"
REPO="presence-io/cc-island"

# Detect architecture
ARCH=$(uname -m)
case "$ARCH" in
  arm64|aarch64) ARCH_SUFFIX="arm64" ;;
  x86_64)        ARCH_SUFFIX="x64" ;;
  *)             echo "Error: Unsupported architecture: $ARCH"; exit 1 ;;
esac

echo "Detecting architecture: $ARCH_SUFFIX"

# Get latest release tag
echo "Fetching latest release..."
RELEASE_INFO=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest")
TAG=$(echo "$RELEASE_INFO" | grep '"tag_name"' | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/')

if [ -z "$TAG" ]; then
  echo "Error: No releases found. Please check https://github.com/$REPO/releases"
  exit 1
fi

echo "Latest version: $TAG"

# Find the ZIP download URL for our architecture
# electron-builder naming: arm64 → "*-arm64-mac.zip", x64 → "*-mac.zip" (no arch suffix)
if [ "$ARCH_SUFFIX" = "arm64" ]; then
  ZIP_URL=$(echo "$RELEASE_INFO" | grep '"browser_download_url"' | grep 'arm64-mac\.zip"' | head -1 | sed -E 's/.*"browser_download_url": *"([^"]+)".*/\1/')
else
  # x64: match "*-mac.zip" but exclude "*-arm64-mac.zip"
  ZIP_URL=$(echo "$RELEASE_INFO" | grep '"browser_download_url"' | grep '\-mac\.zip"' | grep -v 'arm64' | head -1 | sed -E 's/.*"browser_download_url": *"([^"]+)".*/\1/')
fi

if [ -z "$ZIP_URL" ]; then
  echo "Error: No ZIP found for $ARCH_SUFFIX in release $TAG"
  echo "Available assets:"
  echo "$RELEASE_INFO" | grep '"browser_download_url"' | sed -E 's/.*"browser_download_url": *"([^"]+)".*/  \1/'
  exit 1
fi

echo "Downloading: $ZIP_URL"

# Download and install
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

curl -fSL -o "$TMP_DIR/app.zip" "$ZIP_URL"

echo "Extracting..."
unzip -q "$TMP_DIR/app.zip" -d "$TMP_DIR"

# Find the .app bundle
APP_PATH=$(find "$TMP_DIR" -maxdepth 2 -name "*.app" -type d | head -1)

if [ -z "$APP_PATH" ]; then
  echo "Error: No .app bundle found in the archive"
  exit 1
fi

# Remove old version if exists
INSTALL_PATH="/Applications/$(basename "$APP_PATH")"
if [ -d "$INSTALL_PATH" ]; then
  echo "Removing previous installation..."
  rm -rf "$INSTALL_PATH"
fi

# Copy to /Applications
echo "Installing to $INSTALL_PATH..."
cp -R "$APP_PATH" /Applications/

echo ""
echo "✅ $APP_NAME ($TAG) installed successfully!"
echo ""
echo "To launch: open '/Applications/$(basename "$APP_PATH")'"
echo "Or find '$APP_NAME' in Spotlight (⌘ + Space)"
