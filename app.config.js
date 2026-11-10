const appJson = require("./app.json");

/** @type {import("expo/config").ExpoConfig} */
module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      applicationEnv:
        process.env.APPLICATION_ENV ??
        process.env.EXPO_PUBLIC_APPLICATION_ENV,
      devDefaultUserEmail:
        process.env.EXPO_PUBLIC_DEV_DEFAULT_USER_EMAIL ??
        process.env.EXPO_PUBLIC_DEV_SIGN_IN_EMAIL,
    },
  },
};
