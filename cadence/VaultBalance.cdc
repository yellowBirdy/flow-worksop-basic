import FungibleToken from 0x01
    
    pub fun main ():UFix64 {
        
            let acc = getAccount(0x02)
            let vault = acc.getCapability<&{FungibleToken.Balance}>(/public/MainReceiver)!
                .borrow()!

            return vault.balance
        
    }