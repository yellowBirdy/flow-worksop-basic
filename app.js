import "regenerator-runtime/runtime";
import * as fcl from "@onflow/fcl";
import * as sdk from "@onflow/sdk";
import * as types from "@onflow/types";

import fungibleTokenContract from "./cadence/FungibleToken.cdc";
import initTransaction from "./cadence/transactions/init.cdc";

import { mint, getBalance } from "./flow";
import { deployContract, generateCode } from "/utils";


fcl.config()
  .put("challenge.handshake", "http://localhost:8701/flow/authenticate")


const initMainVault = async () => {
  const user = await fcl.currentUser().snapshot()
  const accountAddress = `0x${user.addr}`
  const contractAddress = accountAddress;

  const transaction = sdk.transaction`${await generateCode(initTransaction, {
    query: /(0x01)/g,
    "0x01": contractAddress
  })}`
  const { authorization } = fcl.currentUser();

  return await fcl.send([
    transaction,
    fcl.payer(authorization),
    fcl.proposer(authorization),
    fcl.authorizations([authorization]),
    fcl.limit(100)
  ])
}

window.fcl = fcl

let unsubcsribe = null;
document.getElementById("login").addEventListener('click', ()=>{

    unsubcsribe = fcl.currentUser().subscribe((user)=>{
        console.log({user});
    })
    console.log(fcl.currentUser())
    await fcl.authenticate();
    updateBalance();
})
document.getElementById("logout").addEventListener('click', async ()=>{
  console.log('Logging out:')
  console.log(fcl.currentUser())
  if (typeof unsubscribe === "function") unsubcsribe()
  
  await fcl.unauthenticate();
  updateBalance();
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
  updateBalance()
  
})


const updateBalance = async () => {
  const balanceRes = await getBalance()
  console.log(balanceRes)
  console.log(await fcl.decode(balanceRes))
  const loggedIn = (await fcl.currentUser().snapshot()).loggedIn 

  document.getElementById('balance').innerHTML = loggedIn ? await fcl.decode(balanceRes) : 'NA'
}
