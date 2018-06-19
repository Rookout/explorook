npm run build
cd src/webapp
yarn run build
mv build/* ../../dist/
cd ../..
electron-packager . rookup --prune=true --asar=true --overwrite --platform=linux --arch=x64 --icon=assets/icons/logo.png --out=release-builds
electron-installer-debian --src release-builds/rookup-linux-x64 --arch=amd64 --config debian.json