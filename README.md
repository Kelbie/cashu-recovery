# Cashu Recovery

A client-side web tool for recovering ecash from Cashu mints using your seed phrase. Enter your 12-word mnemonic, and it will scan every known mint for unspent proofs tied to your seed.

**Your seed phrase never leaves your browser.**

## Supported Wallets

- [Sovran](https://sovran.money)
- [Cashu.me](https://cashu.me)
- [Minibits](https://www.minibits.cash)
- [eNuts](https://www.enuts.cash)

Each wallet uses its own key derivation path and restore parameters — select the wallet you originally used so the tool derives the correct keys.

## How It Works

1. Enter your 12-word BIP-39 seed phrase.
2. Select the wallet the seed was created with.
3. The tool fetches a list of known Cashu mints and probes each one for activity tied to your seed.
4. For any mint that responds with matching proofs, a full restore is performed (NUT-09 `batchRestore`).
5. Recovered proofs are checked for spend state (NUT-07) and unspent ecash is displayed with a copyable Cashu token.

## Development

```bash
npm install
npm run dev
```

Runs locally at `http://localhost:5173`.

## Tech Stack

- React, TypeScript, Vite
- Tailwind CSS
- [@cashu/cashu-ts](https://github.com/cashubtc/cashu-ts) for mint communication and token encoding
- [@scure/bip39](https://github.com/nicebytes/noble-hashes) / [@scure/bip32](https://github.com/nicebytes/noble-hashes) for key derivation

## License

MIT
