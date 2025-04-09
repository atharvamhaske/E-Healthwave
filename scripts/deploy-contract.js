const Web3 = require('web3');
const fs = require('fs');
const path = require('path');
const HDWalletProvider = require('@truffle/hdwallet-provider');

async function deployContract() {
    try {
        console.log('Starting contract deployment...');

        // Read contract artifacts
        const contractPath = path.resolve(__dirname, '..', 'contracts');
        const abi = JSON.parse(fs.readFileSync(path.join(contractPath, 'HealthRecord.json')));
        const bytecode = fs.readFileSync(path.join(contractPath, 'HealthRecord.bin'), 'utf8');

        // Connect to local blockchain
        const provider = new HDWalletProvider({
            mnemonic: {
                phrase: "test test test test test test test test test test test junk"
            },
            providerOrUrl: "http://127.0.0.1:8545"
        });

        const web3 = new Web3(provider);
        const accounts = await web3.eth.getAccounts();
        console.log('Deploying from account:', accounts[0]);

        // Deploy contract
        console.log('Deploying contract...');
        const contract = new web3.eth.Contract(abi);
        const deploy = contract.deploy({
            data: '0x' + bytecode
        });

        const gas = await deploy.estimateGas();
        const deployedContract = await deploy.send({
            from: accounts[0],
            gas: Math.floor(gas * 1.1) // Add 10% buffer
        });

        console.log('Contract deployed at:', deployedContract.options.address);

        // Update .env file with contract address
        const envPath = path.resolve(__dirname, '..', '.env');
        let envContent = fs.readFileSync(envPath, 'utf8');
        envContent = envContent.replace(
            /CONTRACT_ADDRESS=.*/,
            `CONTRACT_ADDRESS=${deployedContract.options.address}`
        );
        fs.writeFileSync(envPath, envContent);

        console.log('Updated .env file with contract address');
        
        // Clean up
        provider.engine.stop();
        
        return deployedContract.options.address;
    } catch (error) {
        console.error('Error deploying contract:', error);
        process.exit(1);
    }
}

deployContract();
