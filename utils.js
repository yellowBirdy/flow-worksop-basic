import * as sdk from "@onflow/sdk"
import * as fcl from "@onflow/fcl"
import * as types from "@onflow/types"

export const generateCode = async (url, match) => {
    const codeFile = await fetch(url);
    const rawCode = await codeFile.text();
    if (!match) {
      return rawCode;
    }
  
    const { query } = match;
    return rawCode.replace(query, (item) => {
      return match[item];
    });
};

export const deployContract = async (url) => {

  const code = await (await fetch(url)).text()

  const user = fcl.currentUser();
  const { authorization } = user;

  return fcl.send(
    [
      sdk.transaction`
        transaction (code: String) {
          prepare(acct: AuthAccount) {
            acct.setCode(code.decodeHex())
          }
        }
      `,

      sdk.args([
        sdk.arg(Buffer.from(code, "utf8").toString("hex"), types.String),
      ]),
      fcl.proposer(authorization),
      fcl.payer(authorization),
      fcl.authorizations([authorization]),
      fcl.limit(100),
    ]
  );
};