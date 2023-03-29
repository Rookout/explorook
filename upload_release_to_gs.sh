#!/bin/bash
set -e

VERSION="$(node -e 'console.log(require("./package").version)')"

BUCKET="get.rookout.com"
INSTALLERS_DIR="/Users/distiller/project/installers/"

WINDOWS_FILE_NAME="Rookout Desktop App Setup ${VERSION}.exe"
WINDOWS_NO_SPACE_FILE_NAME="Rookout-Desktop-App-Setup-${VERSION}.exe"
MAC_DMG_FILE_NAME="Rookout Desktop App-${VERSION}.dmg"
MAC_DMG_NO_SPACE_FILE_NAME="Rookout-Desktop-App-${VERSION}.dmg"
MAC_ARM64_DMG_FILE_NAME="Rookout Desktop App-${VERSION}-arm64.dmg"
MAC_ARM64_DMG_NO_SPACE_FILE_NAME="Rookout-Desktop-App-${VERSION}-arm64.dmg"
MAC_ZIP_FILE_NAME="Rookout Desktop App-${VERSION}-mac.zip"
MAC_ZIP_NO_SPACE_FILE_NAME="Rookout-Desktop-App-${VERSION}-mac.zip"
MAC_ARM64_ZIP_FILE_NAME="Rookout Desktop App-${VERSION}-arm64-mac.zip"
MAC_ARM64_ZIP_NO_SPACE_FILE_NAME="Rookout-Desktop-App-${VERSION}-arm64-mac.zip"
LINUX_FILE_NAME="Rookout Desktop App-${VERSION}.AppImage"
LINUX_NO_SPACE_FILE_NAME="Rookout-Desktop-App-${VERSION}.AppImage"
LINUX_ARM64_FILE_NAME="Rookout Desktop App-${VERSION}-arm64.AppImage"
LINUX_ARM64_NO_SPACE_FILE_NAME="Rookout-Desktop-App-${VERSION}-arm64.AppImage"


echo "Starting upload to Google Storage Bucket: ${BUCKET}"
echo "Uploading Windows Installer..."
gsutil cp "${INSTALLERS_DIR}${WINDOWS_FILE_NAME}" "gs://${BUCKET}/explorook/windows/${WINDOWS_NO_SPACE_FILE_NAME}"

echo "Uploading Mac Installers (DMG+ZIP)..."
gsutil cp "${INSTALLERS_DIR}${MAC_DMG_FILE_NAME}" "gs://${BUCKET}/explorook/mac/${MAC_DMG_NO_SPACE_FILE_NAME}"
gsutil cp "${INSTALLERS_DIR}${MAC_ARM64_DMG_FILE_NAME}" "gs://${BUCKET}/explorook/mac/${MAC_ARM64_DMG_NO_SPACE_FILE_NAME}"

gsutil cp "${INSTALLERS_DIR}${MAC_ZIP_FILE_NAME}" "gs://${BUCKET}/explorook/mac/${MAC_ZIP_NO_SPACE_FILE_NAME}"
gsutil cp "${INSTALLERS_DIR}${MAC_ARM64_ZIP_FILE_NAME}" "gs://${BUCKET}/explorook/mac/${MAC_ARM64_ZIP_NO_SPACE_FILE_NAME}"

echo "Uploading Linux Installer..."
gsutil cp "${INSTALLERS_DIR}${LINUX_FILE_NAME}" "gs://${BUCKET}/explorook/linux/${LINUX_NO_SPACE_FILE_NAME}"

gsutil cp "${INSTALLERS_DIR}${LINUX_ARM64_FILE_NAME}" "gs://${BUCKET}/explorook/linux/${LINUX_ARM64_NO_SPACE_FILE_NAME}"

echo "Uploaded release successfully to ${BUCKET} !"
