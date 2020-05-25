const NodeRSA = require("node-rsa");

// projects/rookout/locations/us-central1/keyRings/explorook-hsm/cryptoKeys/auto-auth/cryptoKeyVersions/1
const autoAuthPublicKey = `-----BEGIN PUBLIC KEY-----
MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEAzpfyiQ1KPrzBUSgSDNBP
b/F5uNLP12GbvbDpJwdiwy1T+1e52m/t/PrlMqzzbXsO61qcj4yO/XOLhar2mPXd
7N3DIwlRWxtVpVZDJllFMDSa+o/SYWceCkPqYJoj3Bm4jduXiDQUSq/Sv9BeIvh3
Tb2WGf2FoEo7qyAuFDCqtvJhScdWbrxsy3a9dtpoQVPOHyUaaYevBzW5/uRst+DM
XWgv4PJJz8NKYONTnfCC6DyW58/R8nYTgdwe/oEusCRvy3m7iSaUwdnWRunjFP+D
O6Zd6IX+DGfOVnm8cDMnNMW/Rgi7SNeGi0AgvbYlSXneIKFJ0UdvEyd7JwjnAso0
oIPDM3hyBG2/HgCm9rcx8386CL0GHB8yorPZEfqaCRW8mnUUEkONhwYz8tJW5jQt
jyePq01Qz3UU/Fdve25+219Zoz+9Bh1p7IWQMsWY3sO0wnSt142iLgIFmhjhZRFb
lMAUqc2eq79V4iSU2AG/e8u095yIzJjC1uxC3auLTsSjAgMBAAE=
-----END PUBLIC KEY-----`;

const encryptedPublicKey = new NodeRSA(autoAuthPublicKey, {
  environment: "browser", // Only browser environment supports setting custom hash in encryptionScheme
  encryptionScheme: {
    scheme: "pkcs1_oaep",
    hash: "sha256",
  },
  signingScheme: "pkcs1-sha256",
});

export const encryptWithPublicKey = (
  token: string,
  userId: string,
  site: string
) => {
  // Format of encryption: site;userId;token
  const formattedData = `${site};${userId};${token}`;
  return encryptedPublicKey.encrypt(Buffer.from(formattedData));
};
