# opennic-desktop

OpenNic Desktop is an easy way to use [OpenNic DNS](https://www.opennic.org) servers.
Base on electron framework, it should work on Linux, MacOS and Windows.

There is not released binaries for the moment as the app is still in heavy development.

## Install

```bash
git clone https://github.com/mandrag0ra/opennic-desktop
cd opennic-desktop
yarn install
```

## Run

```bash
yarn start
```

## Build

Use [electron-builder](https://www.electron.build) to build for all operating system.
You can also use [electron-builder cli](https://www.electron.build/cli) to build only for your platform.

Note: if builded from MacOS, you will need to install rpm to build RPM package and snapcraft for snap `brew install rpm snapcraft`

```bash
# To build for all platforms

yarn dist

# Use electron-builder
node_modules/.bin/electron-builder --help
```
