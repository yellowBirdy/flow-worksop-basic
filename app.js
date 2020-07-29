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

const deployContract = async () => {
    // const codeFile = await fetch(empty);
    // const code = await codeFile.text();

    const code = `
    pub contract FungibleToken {
      // Total supply of all tokens in existence.
  pub var totalSupply: UFix64

  // Provider
  // 
  // Interface that enforces the requirements for withdrawing
  // tokens from the implementing type.
  //
  // We don't enforce requirements on self.balance here because
  // it leaves open the possibility of creating custom providers
  // that don't necessarily need their own balance.
  //
  pub resource interface Provider {

      // withdraw
      //
      // Function that subtracts tokens from the owner's Vault
      // and returns a Vault resource (@Vault) with the removed tokens.
      //
      // The function's access level is public, but this isn't a problem
      // because even the public functions are not fully public at first.
      // anyone in the network can call them, but only if the owner grants
      // them access by publishing a resource that exposes the withdraw
      // function.
      //
      pub fun withdraw(amount: UFix64): @Vault {
          post {
              result.balance == UFix64(amount):
                  "Withdrawal amount must be the same as the balance of the withdrawn Vault"
          }
      }
  }

  // Receiver 
  //
  // Interface that enforces the requirements for depositing
  // tokens into the implementing type.
  //
  // We don't include a condition that checks the balance because
  // we want to give users the ability to make custom Receivers that
  // can do custom things with the tokens, like split them up and
  // send them to different places.
  //
pub resource interface Receiver {
      // deposit
      //
      // Function that can be called to deposit tokens 
      // into the implementing resource type
      //
      pub fun deposit(from: @Vault) {
          pre {
              from.balance > UFix64(0):
                  "Deposit balance must be positive"
          }
      }
  }

  pub resource interface Balance {
      pub var balance: UFix64
  }

  // Vault
  //
  // Each user stores an instance of only the Vault in their storage
  // The functions in the Vault and governed by the pre and post conditions
  // in the interfaces when they are called. 
  // The checks happen at runtime whenever a function is called.
  //
  // Resources can only be created in the context of the contract that they
  // are defined in, so there is no way for a malicious user to create Vaults
  // out of thin air. A special Minter resource needs to be defined to mint
  // new tokens.
  // 
  pub resource Vault: Provider, Receiver, Balance {
      
  // keeps track of the total balance of the account's tokens
      pub var balance: UFix64

      // initialize the balance at resource creation time
      init(balance: UFix64) {
          self.balance = balance
      }

      // withdraw
      //
      // Function that takes an integer amount as an argument
      // and withdraws that amount from the Vault.
      //
      // It creates a new temporary Vault that is used to hold
      // the money that is being transferred. It returns the newly
      // created Vault to the context that called so it can be deposited
      // elsewhere.
      //
      pub fun withdraw(amount: UFix64): @Vault {
          self.balance = self.balance - amount
          return <-create Vault(balance: amount)
      }
      
      // deposit
      //
      // Function that takes a Vault object as an argument and adds
      // its balance to the balance of the owners Vault.
      //
      // It is allowed to destroy the sent Vault because the Vault
      // was a temporary holder of the tokens. The Vault's balance has
      // been consumed and therefore can be destroyed.
      pub fun deposit(from: @Vault) {
          self.balance = self.balance + from.balance
          destroy from
      }
  }

  // createEmptyVault
  //
  // Function that creates a new Vault with a balance of zero
  // and returns it to the calling context. A user must call this function
  // and store the returned Vault in their storage in order to allow their
  // account to be able to receive deposits of this token type.
  //
  pub fun createEmptyVault(): @Vault {
      return <-create Vault(balance: 0.0)
  }

// VaultMinter
  //
  // Resource object that an admin can control to mint new tokens
  pub resource VaultMinter {

      pub fun mintTokens(amount: UFix64, recipient: &AnyResource{Receiver}) {
    FungibleToken.totalSupply = FungibleToken.totalSupply + amount
          recipient.deposit(from: <-create Vault(balance: amount))
      }
  }

  // The init function for the contract. All fields in the contract must
  // be initialized at deployment. This is just an example of what
  // an implementation could do in the init function. The numbers are arbitrary.
  init() {
      self.totalSupply = 30.0

      let vault <- create Vault(balance: self.totalSupply)
      self.account.save(<-vault, to: /storage/MainVault)

      // Create a new MintAndBurn resource and store it in account storage
      self.account.save(<-create VaultMinter(), to: /storage/MainMinter)


      // Create a private capability link for the Minter
      // Capabilities can be used to create temporary references to an object
      // so that callers can use the reference to access fields and functions
      // of the objet.
      // 
      // The capability is stored in the /private/ domain, which is only
      // accesible by the owner of the account
      self.account.link<&VaultMinter>(/private/Minter, target: /storage/MainMinter)
  }
}

    `;

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
      ],
      {
        node: "http://localhost:8080",
      }
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
    const response = await deployContract();
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

