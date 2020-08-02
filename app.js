import "regenerator-runtime/runtime";
import * as fcl from "@onflow/fcl";
import * as sdk from "@onflow/sdk";
import * as types from "@onflow/types";

import fungibleTokenContract from "./cadence/FungibleToken.cdc";
import empty from "./cadence/EmptyContract.cdc";
import { mint, getBalance } from "./flow";


fcl.config()
  .put("challenge.handshake", "http://localhost:8701/flow/authenticate")

const simpleComputation = async () => { 
    const script = sdk.script`
        pub fun main():Int{
            return 2 + 2
        }x$
    `;
    const response = await fcl.send([script]);
    console.log({response});
    const result = await fcl.decode(response);
    console.log('Result', result);
}

const readBalance = async () =>{
  const codeFile = await fetch(fungibleTokenContract);
  const code = await codeFile.text();
}

const deployContract = async (url) => {

  const code = await (await fetch(url)).text()

  const user = fcl.currentUser();
  const { authorization } = user;

  return fcl.send(
    [
      sdk.transaction`
          transaction {
            prepare(acct: AuthAccount) {
              acct.setCode("${(p) => p.code}".decodeHex())
            }
          }
        `,
      fcl.params([
        fcl.param(Buffer.from(code, "utf8").toString("hex"), types.Identity, "code"),
      ]),
      fcl.proposer(authorization),
      fcl.payer(authorization),
      fcl.authorizations([authorization]),
      fcl.limit(100),
    ]
  );
};


const initMainVault = async () => {
  const user = await fcl.currentUser().snapshot()
  const accountAddress = `0x${user.addr}`
  const contractAddress = accountAddress;

  console.log({accountAddress, contractAddress});

  const transaction = sdk.transaction`
    // Transaction1.cdc

    import FungibleToken from ${p => p.contractAddress}

    transaction {
      let account: AuthAccount
      prepare(acct: AuthAccount) {

        self.account = acct;
        acct.link<&FungibleToken.Vault{FungibleToken.Receiver, FungibleToken.Balance}>(/public/MainReceiver, target: /storage/MainVault)
    
        log("Public Receiver reference created!")
      }
    
      post {
        getAccount(${p => p.accountAddress}).getCapability(/public/MainReceiver)!
                        .check<&FungibleToken.Vault{FungibleToken.Receiver}>():
                        "Vault Receiver Reference was not created correctly"
        }
    }
  `
  const { authorization } = fcl.currentUser();

  return await fcl.send([
    transaction,
    fcl.params([
      fcl.param(accountAddress, types.Identity, "accountAddress"),
      fcl.param(contractAddress, types.Identity, "contractAddress")
    ]),
    fcl.payer(authorization),
    fcl.proposer(authorization),
    fcl.authorizations([authorization]),
    fcl.limit(100)
  ], {
    node: "http://localhost:8080",
  })

}



let unsubcsribe = null;
document.getElementById("login").addEventListener('click', ()=>{

    unsubcsribe = fcl.currentUser().subscribe((user)=>{
        console.log({user});
    })
    console.log(fcl.currentUser())
    //fcl.authenticate();
})

document.getElementById('deploy').addEventListener('click', async ()=>{
    const response = await deployContract(fungibleTokenContract);
    console.log({response});
})

document.getElementById('init').addEventListener('click', async ()=>{
  const response = await initMainVault();
  console.log({response});
})

document.getElementById('mint').addEventListener('click', async () => {
  const amount = parseInt(document.getElementById('amount').value)
  const response = await mint(amount)
  console.log(fcl.decode(response))
  
  const balanceRes = await getBalance()
  console.log(balanceRes)
  console.log(fcl.decode(balanceRes))

  document.getElementById('balance').innerHTML = await fcl.decode(balanceRes)
})
// simpleComputation();

