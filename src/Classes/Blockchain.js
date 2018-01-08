

export default class Blockchain {
  constructor () {
    this.chain = []
    this.current_transactions = []
    this.last_block = function () {
      // Returns the last Block in the chain
      return this.chain.slice(-1)
    }

    this.new_block(100, 1)
  }

  /**
  * Creates a new Block and adds it to the chain
  * @param {proof} Integer - The proof given by the Proof of Work algorithm
  * @param {previous_hash} String - Hash of previous Block
  * @return {Object} New Block
  */
  new_block (proof, previous_hash = null) {
    const block = {
      index: this.chain.length + 1,
      timestamp: new Date(),
      transactions: this.current_transactions,
      proof,
      previous_hash: previous_hash || Blockchain.hash(this.last_block)
    }
    // Reset the current list of transactions
    this. current_transactions = []

    this.chain.push(block)
    return block
  }

  /**
  * Creates a new transaction to go into the next mined Block
  * @param {sender} String - Address of the Sender
  * @param {recipient} String - Address of the Recipient
  * @param {amount} Integer - Amount
  * @return {Integer} The index of the Block that will hold this transaction
  */
  new_transaction (sender, recipient, amount) {
    this.current_transactions.push({
      sender,
      recipient,
      amount,
    })
    return this.last_block.index + 1
  }

  /**
  * Simple Proof of Work Algorithm:
  *   - Find a number p' such that hash(pp') contains leading 4 zeroes, where p is the previous p'
  *   - p is the previous proof, and p' is the new proof
  * @param {last_proof} Integer
  * @return {Integer}
  */
  proof_of_work (last_proof) {
    let proof = 0
    while (Blockchain.valid_proof(last_proof, proof) === false) {
      proof += 1
    }
    return proof
  }


  /**
  * Hashes a Block using SHA-256
  * @param {block} Object - Block
  * @return {String} The hash of the block
  */
  static hash (block) {
    const block_string = JSON.stringify(block)
    return crypto.createHmac('sha256').update(block_string).digest('hex')
  }

  /**
  * Validates the Proof: Does hash contain 4 leading zeroes?
  * @param {last_proof} Integer - Previous Proof
  * @param {proof} Integer - Current Proof
  * @return {Boolean} True if correct, False if not.
  */
  static valid_proof (block) {
    const guess = `${last_proof}${proof}`
    const guess_hash = crypto.createHmac('sha256').update(guess).digest('hex')
    return guess_hash.splice(-4) === '0000'
  }
}
