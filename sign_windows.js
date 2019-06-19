const package = require("./package.json");

exports.default = async function(configuration) {
  // do not include passwords or other sensitive data in the file
  // rather create environment variables with sensitive data
  const CERTIFICATE_PATH = process.env.WINDOWS_EV_CERTIFICATE_PATH;
  const GOOGLE_HSM_KEY_ID = process.env.GOOGLE_HSM_KEY_ID;
  const EXECUTABLE_PATH = `installers/explorook-setup-${package.version}.exe`;

  const command = [
    "java", "-jar", "jsign.jar",
    "--storetype", "GOOGLE_HSM",
    "--gcloudhsmkeyid", GOOGLE_HSM_KEY_ID,
    "--tsaurl", "http://timestamp.digicert.com",
    "--certfile", CERTIFICATE_PATH,
    "--name", "Explorook",
    "--url", "https://www.rookout.com",
    "--replace",
    EXECUTABLE_PATH,
  ];

  require("child_process").execSync(
    command.join(" "),
    {
      stdio: "inherit",
    },
  );
};
