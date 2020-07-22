import FungibleToken from 0x01 

pub fun main() {
    // Get the accounts' public account objects
    let acct1 = getAccount(0x01)

    // Get references to the account's receivers
    // by getting their public capability
    // and borrowing a reference from the capability
    let acct1ReceiverRef = acct1.getCapability(/public/MainReceiver)!
                            .borrow<&FungibleToken.Vault{FungibleToken.Balance}>()
                            ?? panic("Could not borrow a reference to the acct1 receiver")

    // Use optional chaining to read and log balance fields
    log("Account 1 Balance")
	log(acct1ReceiverRef.balance)
}
