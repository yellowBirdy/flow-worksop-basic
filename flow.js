import * as fcl from "@onflow/fcl"
import * as sdk from "@onflow/sdk"
import * as types from "@onflow/types"

import {generateCode} from "./utils";
import vaultBalance from './cadence/VaultBalance.cdc'


export const mint = async (amount = 10, targetAddress = "0x01cf0e2f2f715450" ) => {

    const {authorization} = fcl.currentUser()

    const contractAddress = "0x01cf0e2f2f715450"
    const transaction = sdk.transaction`import FungibleToken from ${contractAddress}
    
    transaction () {
        
        prepare(signer:AuthAccount) {
            //let targetReceiver = signer.borrow<&{FungibleToken.Receiver,FungibleToken.Balance}>(from: /storage/MainVault)!
            let targetReceiver = getAccount(${targetAddress})
                .getCapability(/public/MainReceiver)!
                .borrow<&{FungibleToken.Receiver,FungibleToken.Balance}>() ??
                panic("Failed to borrow target accounts receiver.")

            let minter = signer.borrow<&FungibleToken.VaultMinter>(from: /storage/MainMinter)!
            minter.mintTokens(amount:UFix64(${amount}),recipient: targetReceiver)

            log(targetReceiver.balance)

        }
   
    }
    `
    console.log(`miniting ${amount} FTs`)
    return await fcl.send(
        [
            transaction,
            fcl.proposer(authorization),
            fcl.payer(authorization),
            fcl.authorizations([authorization]),
            fcl.limit(100)
            
        ],
        {
            node: "http://localhost:8080"
        }
    )

}

export const getBalance = async () => {

    const contractAddress = "0x01cf0e2f2f715450"

    const {authorization} = fcl.currentUser()
    const {addr} = await fcl.currentUser().snapshot()
    const address = `0x${addr}`
    //const address = contractAddress

    const code = await generateCode(vaultBalance, {
        query: /(0x01|0x02)/g,
        "0x01": contractAddress,
        "0x02": address
    })


    const script = sdk.script`${code}`

    console.log(`getting balance`)
    return  await fcl.send([script])
    
}

export const initMainVault = async () => {
    const user = await fcl.currentUser().snapshot()
    const accountAddress = `0x${user.addr}`
    const contractAddress = '0x01cf0e2f2f715450';
  
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