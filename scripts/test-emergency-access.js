const Web3 = require('web3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load contract ABI and address
const contractPath = path.resolve(__dirname, '..', 'contracts');
const contractABI = JSON.parse(fs.readFileSync(path.join(contractPath, 'HealthRecord.json')));
const envPath = path.resolve(__dirname, '..', '.env');
require('dotenv').config({ path: envPath });

async function testEmergencyAccess() {
    try {
        console.log('Testing Emergency Access System...\n');

        // Connect to blockchain
        const web3 = new Web3('http://localhost:8545');
        const accounts = await web3.eth.getAccounts();
        
        // Setup roles
        const ownerAccount = accounts[0];  // Contract owner
        const patientAccount = accounts[1];
        const doctorAccount = accounts[2];
        const emergencyResponderAccount = accounts[3];

        console.log('Test Accounts:');
        console.log('Owner:', ownerAccount);
        console.log('Patient:', patientAccount);
        console.log('Doctor:', doctorAccount);
        console.log('Emergency Responder:', emergencyResponderAccount);

        // Load contract
        const contract = new web3.eth.Contract(
            contractABI,
            process.env.CONTRACT_ADDRESS
        );

        // 1. Add verified provider
        console.log('\n1. Adding verified provider...');
        await contract.methods.addProvider(doctorAccount)
            .send({ from: ownerAccount, gas: 500000 });
        console.log('✓ Doctor verified as provider');

        // 2. Store patient record
        console.log('\n2. Storing patient record...');
        const patientData = {
            name: 'John Doe',
            bloodType: 'A+',
            allergies: ['Penicillin'],
            emergencyContact: '123-456-7890'
        };
        const dataHash = web3.utils.keccak256(JSON.stringify(patientData));
        
        await contract.methods.updateRecord(dataHash)
            .send({ from: patientAccount, gas: 500000 });
        console.log('✓ Patient record stored');

        // 3. Authorize regular doctor access
        console.log('\n3. Authorizing doctor access...');
        await contract.methods.authorizeProvider(doctorAccount)
            .send({ from: patientAccount, gas: 500000 });
        console.log('✓ Doctor authorized');

        // 4. Test regular doctor access
        console.log('\n4. Testing doctor access...');
        const doctorAccess = await contract.methods.getRecord(patientAccount, '')
            .call({ from: doctorAccount, gas: 1000000 });
        console.log('Doctor Access:', doctorAccess);
        console.log('✓ Doctor can access record:', doctorAccess.dataHash === dataHash);

        // 5. Generate emergency PIN
        console.log('\n5. Setting up emergency access...');
        const emergencyPin = crypto.randomBytes(3).toString('hex');
        await contract.methods.setEmergencyAccess(true, emergencyPin)
            .send({ from: patientAccount, gas: 500000 });
        console.log('✓ Emergency PIN set:', emergencyPin);

        // 6. Test emergency access
        console.log('\n6. Testing emergency access...');
        try {
            // First try without PIN (should fail)
            await contract.methods.getRecord(patientAccount, 'wrong-pin')
                .call({ from: emergencyResponderAccount });
            console.log('✗ ERROR: Unauthorized access was allowed!');
        } catch (error) {
            console.log('✓ Unauthorized access correctly denied');
        }

        // Try with correct PIN
        const emergencyAccess = await contract.methods.getRecord(patientAccount, emergencyPin)
            .call({ from: emergencyResponderAccount });
        console.log('✓ Emergency access granted with correct PIN');
        console.log('✓ Retrieved data hash matches:', emergencyAccess.dataHash === dataHash);

        // 7. Disable emergency access
        console.log('\n7. Disabling emergency access...');
        await contract.methods.setEmergencyAccess(false, '')
            .send({ from: patientAccount, gas: 500000 });
        
        // Verify emergency access is disabled
        try {
            await contract.methods.getRecord(patientAccount, emergencyPin)
                .call({ from: emergencyResponderAccount });
            console.log('✗ ERROR: Access still granted after disable!');
        } catch (error) {
            console.log('✓ Emergency access successfully disabled');
        }

        console.log('\nEmergency Access System Test Completed Successfully! ✨');

    } catch (error) {
        console.error('\nError during testing:', error.message);
        process.exit(1);
    }
}

testEmergencyAccess();
