/* eslint-disable max-len */
/* eslint-disable no-unused-vars */
// below is just for reference
//
const set_block_applied_callback_response = {
  jsonrpc: '2.0',
  result:
    {
      previous: '00006c00aa557ba8e7374da7fe9879bb4cc8b6a4',
      timestamp: '2018-05-11T09:20:48',
      witness: 'cyberfounder',
      transaction_merkle_root: '0000000000000000000000000000000000000000',
      extensions: [],
      witness_signature: '2001a...',
      transactions: [transaction, transaction, ...]
    },
  id: 1
};
//
const transaction = {
  ref_block_num: 28966,
  ref_block_prefix: 2882694459,
  expiration: '2018-05-11T10:27:48',
  operations: [['transfer', [Object]]], // operations are tuples [type: String, payload: Object]
  extensions: [],
  signatures: ['201fb...']
}
