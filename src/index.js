import url from 'url'
import request from 'request-promise'
import crypto from 'crypto'
import uuidv4 from 'uuid/v4'
import express from 'express'
import bodyParser from 'body-parser'
// import Blockchain from 'Classes/Blockchain'

const shared_secret = 'super_secret_key'

class Blockchain {
  constructor () {
    this.nodes = new Set()
    this.chain = []
    this.current_transactions = []
    this.last_block = function () {
      // Returns the last Block in the chain
      return this.chain.slice(-1)[0]
    }

    this.new_block(100, 1)
  }

  /**
  * Add a new node to the list of nodes
  * @param {address} String - Address of node. Eg. 'http://192.168.0.5:5000'
  * @return {}
  */
  register_node (address) {
    const parsed_url = url.parse(address)
    this.nodes.add(parsed_url.host)
  }

  /**
  * Determine if a given blockchain is valid
  * @param {chain} Array -  A blockchain
  * @return {Boolean} True if valid, False if not
  */
  valid_chain (chain) {
    let last_block = chain[0]
    let current_index = 1

    while (current_index < chain.length) {
      const block = chain[current_index]

      // Check that the hash of the block is correct
      if (block.previous_hash !== Blockchain.hash(last_block)) {
        return false
      }

      // Check that the Proof of Work is correct
      if (!Blockchain.valid_proof(last_block.proof, block.proof)) {
        return false
      }

      last_block = block
      current_index += 1
    }

    return true
  }

  /**
  * This is our Consensus Algorithm, it resolves conflicts
  * by replacing our chain with the longest one in the network.
  * @return {Boolean} True if our chain was replaced, False if not
  */
  resolve_conflicts () {
    return new Promise((resolve, reject) => {
      const finish = () => {
        // Replace our chain if we discovered a new, valid chain longer than ours
        if (new_chain) {
          this.chain = new_chain
          resolve(true)
          return
        }
        resolve(false)
      }

      const neighbours = this.nodes
      let new_chain = null

      // We're only looking for chains longer than ours
      let max_length = this.chain.length

      let total = neighbours.size
      let counter = 0

      if (total === 0) {
        finish()
        return
      }

      // Grab and verify the chains from all the nodes in our network
      for (const node of neighbours) {
        request({uri: `http://${node}/chain`, json: true })
          .then((res) => {
            const length = res.length
            const chain = res.chain

            // Check if the length is longer and the chain is valid
            if (length > max_length && blockchain.valid_chain(chain)) {
              max_length = length
              new_chain = chain
            }
          })
          .catch((err) => {
            console.log(err)
          })
          .then(() => {
            counter += 1
            if (counter > total-1) finish()
          })
      }
    })
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
      previous_hash: previous_hash || Blockchain.hash(this.last_block())
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
    return this.last_block().index + 1
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
    return crypto.createHmac('sha256', shared_secret).update(block_string).digest('hex')
  }

  /**
  * Validates the Proof: Does hash contain 4 leading zeroes?
  * @param {last_proof} Integer - Previous Proof
  * @param {proof} Integer - Current Proof
  * @return {Boolean} True if correct, False if not.
  */
  static valid_proof (last_proof, proof) {
    const guess = `${last_proof}${proof}`
    const guess_hash = crypto.createHmac('sha256', shared_secret).update(guess).digest('hex')
    return guess_hash.slice(-4) === '0000'
  }
}


const node_identifier = uuidv4().replace(/-/g, '')
const blockchain = new Blockchain()

const app = express()
app.use(bodyParser.json())

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/id', (req, res) => {
  res.json({node_identifier})
})

app.get('/mine', (req, res) => {
  // We run the proof of work algorithm to get the next proof...
  const last_block = blockchain.last_block()
  const last_proof = last_block.proof
  const proof = blockchain.proof_of_work(last_proof)

  // We must receive a reward for finding the proof.
  // The sender is "0" to signify that this node has mined a new coin.
  blockchain.new_transaction("0", node_identifier, 1)

  // Forge the new Block by adding it to the chain
  const previous_hash = Blockchain.hash(last_block)
  const block = blockchain.new_block(proof, previous_hash)

  res.json({
    message: 'New Block Forged',
    index: block.index,
    transactions: block.transactions,
    proof: block.proof,
    previous_hash: block.previous_hash,
  })
})

app.post('/transactions/new', (req, res) => {
  const sender = req.body.sender
  const recipient = req.body.recipient
  const amount = Number(req.body.amount)

  // Check that the required fields are in the POST'ed data
  if (!sender || !recipient || !amount) {
    res.status(400)
    res.json({ error: 'Missing values' })
    return
  }

  // Create a new Transaction
  const index = blockchain.new_transaction(sender, recipient, amount)

  res.status(201)
  res.json({
    message: `Transaction will be added to Block ${index}`,
  })
})

app.post('/nodes/register', (req, res) => {
  const nodes = req.body.nodes

  // Check that the required fields are in the POST'ed data
  if (!nodes) {
    res.status(400)
    res.json({ error: 'Missing values' })
    return
  }


  for (const node of nodes) {
    if (!node) {
      res.status(400)
      res.json({ error: 'Please supply a valid list of nodes' })
      return
    }
  }

  for (const node of nodes) {
    blockchain.register_node(node)
  }

  res.status(201)
  res.json({
    message: `New nodes have been added`,
    total_nodes: blockchain.nodes.size,
  })
})

app.get('/nodes/resolve', (req, res) => {
  blockchain.resolve_conflicts().then((replaced) => {
    let message = ''
    if (replaced) {
      message = 'Our chain was replaced'
    } else {
      message = 'Our chain is authoritative'
    }

    res.json({
      message,
      chain: blockchain.chain,
    })
  })
})

app.get('/chain', (req, res) => {
  res.json({
    chain: blockchain.chain,
    length: blockchain.chain.length,
  })
})

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`Blockchain is listening on port ${port}`))
