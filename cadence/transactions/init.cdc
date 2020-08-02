
// Transaction1.cdc

import FungibleToken from 0x01

transaction {
    let account: AuthAccount
    prepare(signer: AuthAccount) {

        self.account = signer;
        
        //if signer.load<@FungibleToken.Vault>(from: /storage/MainVault) == nil {
        //        signer.save(<-FungibleToken.createEmptyVault(), to: /storage/MainVault)
        //}   
        if signer.borrow<&FungibleToken.Vault>(from: /storage/MainVault) == nil {
                signer.save(<-FungibleToken.createEmptyVault(), to: /storage/MainVault)
        }  
        signer.link<&FungibleToken.Vault{FungibleToken.Receiver, FungibleToken.Balance}>(/public/MainReceiver, target: /storage/MainVault)

        log("Public Receiver reference created!")
    }

    post {
        self.account.getCapability(/public/MainReceiver)!
            .check<&FungibleToken.Vault{FungibleToken.Receiver}>():
           "Vault Receiver Reference was not created correctly"
    }
}
  