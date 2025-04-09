const Web3 = require('web3');
const fs = require('fs');
const path = require('path');
const http = require('http');
require('dotenv').config({ path: path.resolve(__dirname, '../../hospital-website/.env') });

async function testFrontendIntegration() {
    try {
        console.log('Testing Frontend-Blockchain Integration...\n');

        // 1. Check if contract ABI is accessible to frontend
        console.log('1. Checking contract ABI accessibility...');
        const frontendContractsDir = path.resolve(__dirname, '../../hospital-website/src/contracts');
        if (!fs.existsSync(frontendContractsDir)) {
            fs.mkdirSync(frontendContractsDir, { recursive: true });
        }
        
        const backendABI = path.resolve(__dirname, '../contracts/HealthRecord.json');
        const frontendABI = path.join(frontendContractsDir, 'HealthRecord.json');
        
        fs.copyFileSync(backendABI, frontendABI);
        console.log('✓ Contract ABI copied to frontend');

        // 2. Check if environment variables are set
        console.log('\n2. Checking environment variables...');
        const envPath = path.resolve(__dirname, '../../hospital-website/.env');
        require('dotenv').config({ path: envPath });
        const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;

        console.log('Contract Address:', contractAddress);

        if (!contractAddress) {
            throw new Error('CONTRACT_ADDRESS not found in environment');
        }

        console.log('✓ Frontend environment variables set');

        // 3. Test Web3 connection
        console.log('\n3. Testing Web3 connection...');
        const web3 = new Web3('http://localhost:8545');
        const networkId = await web3.eth.net.getId();
        console.log('✓ Connected to network:', networkId);

        // 4. Test contract deployment
        console.log('\n4. Verifying contract deployment...');
        const contract = new web3.eth.Contract(
            require(backendABI),
            contractAddress
        );

        const code = await web3.eth.getCode(contractAddress);
        if (code === '0x') {
            throw new Error('Contract not deployed at address: ' + contractAddress);
        }
        console.log('✓ Contract verified at:', contractAddress);

        // 5. Test frontend server accessibility
        console.log('\n5. Checking frontend server accessibility...');
        const frontendUrl = 'http://localhost:3000';
        await new Promise((resolve, reject) => {
            http.get(frontendUrl, (res) => {
                if (res.statusCode === 200) {
                    console.log('✓ Frontend server accessible');
                    resolve();
                } else {
                    reject(new Error(`Frontend server returned status ${res.statusCode}`));
                }
            }).on('error', (err) => {
                console.log('ℹ Frontend server not running (this is okay if you haven\'t started it yet)');
                resolve();
            });
        });

        console.log('\nFrontend Integration Test Completed Successfully! ✨');
        console.log('\nNext steps:');
        console.log('1. Start the frontend server: cd hospital-website && npm start');
        console.log('2. Test emergency access features through the UI');
        console.log('3. Verify blockchain transactions in the browser console');

    } catch (error) {
        console.error('\nError during testing:', error.message);
        process.exit(1);
    }
}

testFrontendIntegration();
