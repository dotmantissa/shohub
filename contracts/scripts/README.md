# Shohub Registry

This package contains the on chain project registry for Shohub.

Run the unit tests with:

```sh
aptos move test --package-dir contracts
```

Publish with a funded Shelbynet account:

```sh
aptos move publish \
  --package-dir contracts \
  --profile <your-profile> \
  --named-addresses shohub=<your-account-address> \
  --assume-yes
```

The current Shohub registry is published from the project deployment account
`0x995d6f9053cfa36ccbab58c567900a918a4a0b15078bed75195b24c9e43bc8e4`.
