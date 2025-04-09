const ganache = require('ganache');

const options = {
    wallet: {
        mnemonic: "test test test test test test test test test test test junk",
        totalAccounts: 10,
        defaultBalance: 1000
    },
    chain: {
        chainId: 1337,
        networkId: 1337
    },
    logging: {
        quiet: false
    }
};

const server = ganache.server(options);

server.listen(8545, async (err) => {
    if (err) {
        console.error('Error starting Ganache:', err);
        process.exit(1);
    }
    
    console.log('Local blockchain started on http://127.0.0.1:8545');
    console.log('Chain ID:', options.chain.chainId);
    console.log('Network ID:', options.chain.networkId);
    
    const provider = server.provider;
    const accounts = await provider.request({
        method: "eth_accounts",
        params: []
    });
    
    console.log('\nAvailable Accounts:');
    accounts.forEach((account, i) => {
        console.log(`(${i}) ${account}`);
    });
});
