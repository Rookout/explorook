#!/bin/bash
set -e

VERSION="$(node -e 'console.log(require("./package").version)')"

BUCKET="get.rookout.com"
INSTALLERS_DIR="/Users/distiller/project/installers/"

WINDOWS_FILE_NAME="Explorook Setup ${VERSION}.exe"
WINDOWS_NO_SPACE_FILE_NAME="explorook-setup-${VERSION}.exe"
MAC_DMG_FILE_NAME="Explorook-${VERSION}.dmg"
MAC_ZIP_FILE_NAME="Explorook-${VERSION}-mac.zip"
LINUX_FILE_NAME="explorook-${VERSION}-x86_64.AppImage"


echo "Starting upload to Google Storage Bucket: ${BUCKET}"
echo "Uploading Windows Installer..."
gsutil cp "${INSTALLERS_DIR}${WINDOWS_FILE_NAME}" "gs://${BUCKET}/explorook/windows/${WINDOWS_NO_SPACE_FILE_NAME}"
gsutil acl ch -u AllUsers:R "gs://${BUCKET}/explorook/windows/${WINDOWS_NO_SPACE_FILE_NAME}"

echo "Uploading Mac Installers (DMG+ZIP)..."
gsutil cp "${INSTALLERS_DIR}${MAC_DMG_FILE_NAME}" "gs://${BUCKET}/explorook/mac/${MAC_DMG_FILE_NAME}"
gsutil acl ch -u AllUsers:R "gs://${BUCKET}/explorook/mac/${MAC_DMG_FILE_NAME}"

gsutil cp "${INSTALLERS_DIR}${MAC_ZIP_FILE_NAME}" "gs://${BUCKET}/explorook/mac/${MAC_ZIP_FILE_NAME}"
gsutil acl ch -u AllUsers:R "gs://${BUCKET}/explorook/mac/${MAC_ZIP_FILE_NAME}"

echo "Uploading Linux Installer..."
gsutil cp "${INSTALLERS_DIR}${LINUX_FILE_NAME}" "gs://${BUCKET}/explorook/linux/${LINUX_FILE_NAME}"
gsutil acl ch -u AllUsers:R "gs://${BUCKET}/explorook/linux/${LINUX_FILE_NAME}"

echo "Uploaded release successfully to ${BUCKET} !"
