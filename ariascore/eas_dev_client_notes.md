# EAS Build Configuration Notes

This project uses EAS to build both production and preview versions of the app.

---

## 📦 Available Build Profiles (`eas.json`)

### ✅ `production`
- For App Store / Google Play release builds.
- Uses optimized settings for publishing.
- Does **not** include a dev client.
- Can be opened with Expo Go **if no native code added**.

### ✅ `preview`
- For internal testing (QR code, direct link, etc).
- No dev client included.
- Can be opened with Expo Go.

### 🧪 `development` (Optional – commented out)
> Use this only if you need native modules not supported by Expo Go.

To enable:
1. Install the custom dev client:
    ```bash
    npx expo install expo-dev-client
    ```

2. Add this to `eas.json` under `build`:
    ```json
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    }
    ```

3. Build the dev client:
    ```bash
    eas build --profile development --platform android
    # or for iOS
    eas build --profile development --platform ios
    ```

4. Start your project with:
    ```bash
    npx expo start --dev-client
    ```

5. Open the project using the **custom dev client app**, **not Expo Go**.

---

## 🔁 Switching Back to Expo Go

To disable the custom dev client:

- Run:
  ```bash
  npx expo uninstall expo-dev-client
