#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const bumpType = process.argv[2] ?? "patch";
const validBumps = ["patch", "minor", "major"];

if (!validBumps.includes(bumpType)) {
  throw new Error(`Invalid bump type "${bumpType}". Use patch, minor, or major.`);
}

const root = process.cwd();

const appJsonPath = path.join(root, "app.json");
const appConfigTsPath = path.join(root, "app.config.ts");
const androidGradlePath = path.join(root, "android", "app", "build.gradle");
const iosDir = path.join(root, "ios");

function bumpSemver(version, type) {
  const match = String(version).match(/^(\d+)\.(\d+)\.(\d+)$/);

  if (!match) {
    throw new Error(`Invalid semantic version: ${version}`);
  }

  let major = Number(match[1]);
  let minor = Number(match[2]);
  let patch = Number(match[3]);

  if (type === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (type === "minor") {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }

  return `${major}.${minor}.${patch}`;
}

function findIosPbxproj() {
  if (!fs.existsSync(iosDir)) return null;

  const xcodeproj = fs
    .readdirSync(iosDir)
    .find((entry) => entry.endsWith(".xcodeproj"));

  if (!xcodeproj) return null;

  return path.join(iosDir, xcodeproj, "project.pbxproj");
}

function getCurrentVersion() {
  if (fs.existsSync(appJsonPath)) {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
    return appJson.expo?.version;
  }

  if (fs.existsSync(androidGradlePath)) {
    const gradle = fs.readFileSync(androidGradlePath, "utf8");
    const match = gradle.match(/versionName\s+["']([^"']+)["']/);
    if (match) return match[1];
  }

  const pbxprojPath = findIosPbxproj();

  if (pbxprojPath) {
    const pbxproj = fs.readFileSync(pbxprojPath, "utf8");
    const match = pbxproj.match(/MARKETING_VERSION = ([^;]+);/);
    if (match) return match[1].trim();
  }

  throw new Error("Could not determine current app version.");
}

function updateAppJson(nextVersion) {
  if (!fs.existsSync(appJsonPath)) return null;

  const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));

  appJson.expo ??= {};
  appJson.expo.android ??= {};
  appJson.expo.ios ??= {};

  const previousVersion = appJson.expo.version;
  const previousAndroidCode = Number(appJson.expo.android.versionCode ?? 0);
  const previousIosBuild = Number(appJson.expo.ios.buildNumber ?? 0);

  appJson.expo.version = nextVersion;
  appJson.expo.android.versionCode = previousAndroidCode + 1;
  appJson.expo.ios.buildNumber = String(previousIosBuild + 1);

  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + "\n");

  return {
    file: "app.json",
    version: [previousVersion, nextVersion],
    androidBuild: [previousAndroidCode, previousAndroidCode + 1],
    iosBuild: [previousIosBuild, previousIosBuild + 1],
  };
}

function updateAppConfigTs(nextVersion) {
  if (!fs.existsSync(appConfigTsPath)) return null;

  let config = fs.readFileSync(appConfigTsPath, "utf8");

  const versionMatch = config.match(/version:\s*["']([^"']+)["']/);
  const androidCodeMatch = config.match(/versionCode:\s*(\d+)/);
  const iosBuildMatch = config.match(/buildNumber:\s*["']?(\d+)["']?/);

  if (!versionMatch) {
    throw new Error("Could not find version in app.config.ts");
  }

  if (!androidCodeMatch) {
    throw new Error("Could not find android.versionCode in app.config.ts");
  }

  if (!iosBuildMatch) {
    throw new Error("Could not find ios.buildNumber in app.config.ts");
  }

  const previousVersion = versionMatch[1];
  const previousAndroidCode = Number(androidCodeMatch[1]);
  const previousIosBuild = Number(iosBuildMatch[1]);

  config = config.replace(
    /version:\s*["'][^"']+["']/,
    `version: "${nextVersion}"`
  );

  config = config.replace(
    /versionCode:\s*\d+/,
    `versionCode: ${previousAndroidCode + 1}`
  );

  config = config.replace(
    /buildNumber:\s*["']?\d+["']?/,
    `buildNumber: "${previousIosBuild + 1}"`
  );

  fs.writeFileSync(appConfigTsPath, config);

  return {
    file: "app.config.ts",
    version: [previousVersion, nextVersion],
    androidBuild: [previousAndroidCode, previousAndroidCode + 1],
    iosBuild: [previousIosBuild, previousIosBuild + 1],
  };
}

function updateAndroidNative(nextVersion) {
  if (!fs.existsSync(androidGradlePath)) return null;

  let gradle = fs.readFileSync(androidGradlePath, "utf8");

  const versionNameMatch = gradle.match(/versionName\s+["']([^"']+)["']/);
  const versionCodeMatch = gradle.match(/versionCode\s+(\d+)/);

  if (!versionNameMatch) {
    throw new Error("Could not find versionName in android/app/build.gradle");
  }

  if (!versionCodeMatch) {
    throw new Error("Could not find versionCode in android/app/build.gradle");
  }

  const previousVersion = versionNameMatch[1];
  const previousBuild = Number(versionCodeMatch[1]);
  const nextBuild = previousBuild + 1;

  gradle = gradle.replace(
    /versionName\s+["'][^"']+["']/,
    `versionName "${nextVersion}"`
  );

  gradle = gradle.replace(
    /versionCode\s+\d+/,
    `versionCode ${nextBuild}`
  );

  fs.writeFileSync(androidGradlePath, gradle);

  return {
    file: "android/app/build.gradle",
    version: [previousVersion, nextVersion],
    build: [previousBuild, nextBuild],
  };
}

function updateIosNative(nextVersion) {
  const pbxprojPath = findIosPbxproj();

  if (!pbxprojPath || !fs.existsSync(pbxprojPath)) return null;

  let pbxproj = fs.readFileSync(pbxprojPath, "utf8");

  const marketingVersionMatch = pbxproj.match(/MARKETING_VERSION = ([^;]+);/);
  const buildNumberMatch = pbxproj.match(/CURRENT_PROJECT_VERSION = ([^;]+);/);

  if (!marketingVersionMatch) {
    throw new Error("Could not find MARKETING_VERSION in iOS project.");
  }

  if (!buildNumberMatch) {
    throw new Error("Could not find CURRENT_PROJECT_VERSION in iOS project.");
  }

  const previousVersion = marketingVersionMatch[1].trim();
  const previousBuild = Number(buildNumberMatch[1].trim());
  const nextBuild = previousBuild + 1;

  if (!Number.isInteger(previousBuild)) {
    throw new Error(`Invalid CURRENT_PROJECT_VERSION: ${previousBuild}`);
  }

  pbxproj = pbxproj.replaceAll(
    `MARKETING_VERSION = ${previousVersion};`,
    `MARKETING_VERSION = ${nextVersion};`
  );

  pbxproj = pbxproj.replaceAll(
    `CURRENT_PROJECT_VERSION = ${previousBuild};`,
    `CURRENT_PROJECT_VERSION = ${nextBuild};`
  );

  fs.writeFileSync(pbxprojPath, pbxproj);

  return {
    file: path.relative(root, pbxprojPath),
    version: [previousVersion, nextVersion],
    build: [previousBuild, nextBuild],
  };
}

const currentVersion = getCurrentVersion();
const nextVersion = bumpSemver(currentVersion, bumpType);

const results = [
  updateAppJson(nextVersion),
  updateAppConfigTs(nextVersion),
  updateAndroidNative(nextVersion),
  updateIosNative(nextVersion),
].filter(Boolean);

console.log(`Version bump: ${bumpType}`);
console.log(`App version: ${currentVersion} → ${nextVersion}`);
console.log("");

for (const result of results) {
  console.log(`Updated ${result.file}`);

  if (result.version) {
    console.log(`  version: ${result.version[0]} → ${result.version[1]}`);
  }

  if (result.build) {
    console.log(`  build: ${result.build[0]} → ${result.build[1]}`);
  }

  if (result.androidBuild) {
    console.log(`  android.versionCode: ${result.androidBuild[0]} → ${result.androidBuild[1]}`);
  }

  if (result.iosBuild) {
    console.log(`  ios.buildNumber: ${result.iosBuild[0]} → ${result.iosBuild[1]}`);
  }

  console.log("");
}

if (results.length === 0) {
  throw new Error("No version files were updated.");
}