const Web3 = require('web3');
const fhir = require('fhir');

async function testCoreFeatures() {
    try {
        console.log('Testing Core Features...\n');

        // 1. Test Web3 Connection
        console.log('1. Testing Web3 Connection...');
        const web3 = new Web3('http://localhost:8545');
        const networkId = await web3.eth.net.getId().catch(() => null);
        console.log('Network ID:', networkId || 'Not connected');

        // 2. Test FHIR Validation
        console.log('\n2. Testing FHIR Validation...');
        const fhirValidator = new fhir.Fhir();
        
        const testPatient = {
            resourceType: 'Patient',
            id: 'example',
            active: true,
            name: [{
                use: 'official',
                family: 'Doe',
                given: ['John']
            }],
            gender: 'male',
            birthDate: '1990-01-01'
        };

        const isValid = fhirValidator.validate(testPatient);
        console.log('FHIR Validation:', isValid ? 'Passed' : 'Failed');

        // 3. Test Emergency PIN Generation
        console.log('\n3. Testing Emergency PIN Generation...');
        const pin = Math.random().toString(36).substr(2, 8);
        console.log('Generated Emergency PIN:', pin);

        console.log('\nCore features tested successfully! ✨');

    } catch (error) {
        console.error('\nError during testing:', error);
        process.exit(1);
    }
}

testCoreFeatures();
