const package = require("./package.json");

exports.default = async function(configuration) {
  // do not include passwords or other sensitive data in the file
  // rather create environment variables with sensitive data
  const PE_PATH = configuration.path;
  if (PE_PATH.includes(".dll")) {
    return true;
  }

  const CERTIFICATE_PATH = process.env.WINDOWS_EV_CERTIFICATE_PATH;
  const GOOGLE_HSM_KEY_ID = process.env.GOOGLE_HSM_KEY_ID;

  const command = [
    "java", "-jar", "jsign.jar",
    "--storetype", "GOOGLE_HSM",
    "--gcloudhsmkeyid", GOOGLE_HSM_KEY_ID,
    "--tsaurl", "http://timestamp.digicert.com",
    "--certfile", CERTIFICATE_PATH,
    "--name", `"${configuration.name}"`,
    "--url", configuration.site,
    "--replace",
    `"${PE_PATH}"`,
  ];

  require("child_process").execSync(
    command.join(" "),
    {
      stdio: "inherit",
    },
  );
};
